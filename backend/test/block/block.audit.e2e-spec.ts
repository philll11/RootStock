import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Orchard, OrchardDocument } from '../../src/assets/orchards/schemas/orchard.schema';
import { Block, BlockDocument } from '../../src/assets/blocks/schemas/block.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { AuditEntry, AuditEntryDocument, AuditAction } from '../../src/system/audits/schemas/audit.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';

describe('Blocks Audit Integration (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let jwtService: JwtService;

  let clientModel: Model<ClientDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let subsidiaryModel: Model<SubsidiaryDocument>;
  let orchardModel: Model<OrchardDocument>;
  let blockModel: Model<BlockDocument>;
  let varietyModel: Model<VarietyDocument>;
  let auditModel: Model<AuditEntryDocument>;
  let systemConfigModel: Model<SystemConfigDocument>;

  let adminToken: string;
  let adminUser: UserDocument;
  let subsidiary: SubsidiaryDocument;
  let client: ClientDocument;
  let orchard: OrchardDocument;
  let variety: VarietyDocument;

  jest.setTimeout(30000);

  beforeAll(async () => {
    ({ app, mongod, jwtService } = await setupTestApp());

    clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
    subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
    orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
    blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
    varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
    auditModel = app.get<Model<AuditEntryDocument>>(getModelToken(AuditEntry.name));
    systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));

    // 1. Enable Auditing in System Config
    await systemConfigModel.create({
      key: 'audit',
      value: { enabled: true },
      description: 'Global Audit Config',
      isSystem: true,
    });

    // 2. Create Role
    const adminRole = await roleModel.create({
      name: 'Admin',
      recordId: 'ROL001',
      permissions: [
        PERMISSIONS.BLOCK_CREATE,
        PERMISSIONS.BLOCK_VIEW,
        PERMISSIONS.BLOCK_EDIT,
        PERMISSIONS.BLOCK_DELETE,
        PERMISSIONS.BLOCK_MANAGE_INACTIVE,
        PERMISSIONS.ORCHARD_VIEW, // Needed for orchard checks
        PERMISSIONS.CLIENT_VIEW, // Needed for client checks
      ],
      visibilityScope: VisibilityScope.GLOBAL,
    });

    // 3. Create Subsidiary
    subsidiary = await subsidiaryModel.create({
      name: 'Test Subsidiary',
      recordId: 'SUB001',
    });

    // 4. Create Client
    client = await clientModel.create({
      name: 'Test Client',
      subsidiaryId: subsidiary._id,
      recordId: 'CLI001',
    });

    // 5. Create Orchard
    orchard = await orchardModel.create({
      name: 'Test Orchard',
      clientId: client._id,
      recordId: 'ORC001',
      hectares: 10,
    });

    // 5.1 Create Variety
    variety = await varietyModel.create({
      name: 'Test Variety',
      recordId: 'VAR001',
    });

    // 6. Create Admin User
    adminUser = await userModel.create({
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      roleId: adminRole._id,
      userType: UserType.EMPLOYEE,
      recordId: 'USR001',
    });

    adminToken = jwtService.sign({ 
      sub: adminUser.recordId, 
      email: adminUser.email,
      tokenVersion: 0 
    });
  });

  afterAll(async () => {
    await teardownTestApp({ app, mongod });
  });

  afterEach(async () => {
    await auditModel.deleteMany({});
    await blockModel.deleteMany({});
  });

  it('should log AuditAction.CREATE when a block is created', async () => {
    const createDto = {
      name: 'Audit Test Block',
      orchardId: orchard._id.toString(),
      plantings: [
        {
          varietyId: (variety as any)._id.toString(),
          treeCount: 100,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createDto)
      .expect(201);

    const createdBlock = res.body;

    // Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.BLOCK, resourceId: createdBlock._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.CREATE);
    expect(logs[0].userId.toString()).toBe(adminUser._id.toString());
    expect(logs[0].reason).toBe('Block Created');
  });

  it('should log AuditAction.UPDATE when a block is updated', async () => {
    // 1. Create Block
    const block = await blockModel.create({
      name: 'Update Test Block',
      orchardId: orchard._id,
      clientId: client._id,
      recordId: 'BLK001',
      hectares: 2,
      isActive: true,
    });

    // 2. Update Block
    const updateDto = {
      name: 'Updated Block Name',
      __v: block.__v,
    };

    await request(app.getHttpServer())
      .patch(`/blocks/${block._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.BLOCK, resourceId: block._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          oldValue: 'Update Test Block',
          newValue: 'Updated Block Name',
        }),
      ]),
    );
  });

  it('should log AuditAction.DELETE when a block is deleted', async () => {
    // 1. Create Block
    const block = await blockModel.create({
      name: 'Delete Test Block',
      orchardId: orchard._id,
      clientId: client._id,
      recordId: 'BLK002',
      hectares: 3,
    });

    // 2. Delete Block
    await request(app.getHttpServer())
      .delete(`/blocks/${block._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.BLOCK, resourceId: block._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.DELETE);
    expect(logs[0].metadata?.snapshot).toBeDefined();
    expect(logs[0].metadata?.snapshot.name).toBe('Delete Test Block');
  });
});
