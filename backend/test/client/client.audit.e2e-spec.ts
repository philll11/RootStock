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
import { AuditEntry, AuditEntryDocument, AuditAction } from '../../src/system/audits/schemas/audit.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';

describe('Clients Audit Integration (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let jwtService: JwtService;

  let clientModel: Model<ClientDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let subsidiaryModel: Model<SubsidiaryDocument>;
  let auditModel: Model<AuditEntryDocument>;
  let systemConfigModel: Model<SystemConfigDocument>;

  let adminToken: string;
  let adminUser: UserDocument;
  let subsidiary: SubsidiaryDocument;

  jest.setTimeout(30000);

  beforeAll(async () => {
    ({ app, mongod, jwtService } = await setupTestApp());

    clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
    subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
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
        PERMISSIONS.CLIENT_CREATE,
        PERMISSIONS.CLIENT_VIEW,
        PERMISSIONS.CLIENT_EDIT,
        PERMISSIONS.CLIENT_DELETE,
        PERMISSIONS.CLIENT_MANAGE_INACTIVE,
      ],
      visibilityScope: VisibilityScope.GLOBAL,
    });

    // 3. Create Subsidiary
    subsidiary = await subsidiaryModel.create({
      name: 'Test Subsidiary',
      recordId: 'SUB001',
    });

    // 4. Create Admin User
    adminUser = await userModel.create({
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      roleId: adminRole._id,
      userType: UserType.EMPLOYEE,
      recordId: 'USR001',
    });

    adminToken = jwtService.sign({ sub: adminUser.recordId, email: adminUser.email, tokenVersion: 0 });
  });

  afterAll(async () => {
    await teardownTestApp({ app, mongod });
  });

  afterEach(async () => {
    // Clean up audits after each test to ensure isolation
    await auditModel.deleteMany({});
    await clientModel.deleteMany({});
  });

  it('should log AuditAction.CREATE when a client is created', async () => {
    const createDto = {
      name: 'Audit Test Client',
      subsidiaryId: subsidiary._id.toString(),
    };

    const res = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createDto)
      .expect(201);

    const createdClient = res.body;

    // Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.CLIENT, resourceId: createdClient._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.CREATE);
    expect(logs[0].userId.toString()).toBe(adminUser._id.toString());
    expect(logs[0].reason).toBe('Client Created');
  });

  it('should log AuditAction.UPDATE when a client is updated', async () => {
    // 1. Create Client directly (bypass audit for setup, or just ignore the create log)
    const client = await clientModel.create({
      name: 'Update Test Client',
      subsidiaryId: subsidiary._id,
      recordId: 'CLI001',
      isActive: true,
    });

    // 2. Update Client
    const updateDto = {
      name: 'Updated Name',
      __v: client.__v,
    };

    await request(app.getHttpServer())
      .patch(`/clients/${client._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log
    // We might have a CREATE log if we used the API, but here we used model.create, so only UPDATE should exist?
    // Wait, model.create doesn't trigger service logic, so no CREATE log.
    const logs = await auditModel.find({ resource: Resource.CLIENT, resourceId: client._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          oldValue: 'Update Test Client',
          newValue: 'Updated Name',
        }),
      ]),
    );
  });

  it('should log AuditAction.UPDATE with assignedUserIds when users are assigned', async () => {
    // 1. Create Client
    const client = await clientModel.create({
      name: 'Assign Test Client',
      subsidiaryId: subsidiary._id,
      recordId: 'CLI002',
    });

    // 2. Create another user to assign
    const userToAssign = await userModel.create({
      name: 'Assignee User',
      firstName: 'Assignee',
      lastName: 'User',
      email: 'assignee@example.com',
      userType: UserType.EMPLOYEE,
      recordId: 'USR002',
    });

    // 3. Assign User
    await request(app.getHttpServer())
      .put(`/clients/${client._id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [userToAssign._id.toString()] })
      .expect(204);

    // 4. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.CLIENT, resourceId: client._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].reason).toBe('Client Users Assigned');
    
    // Check diff for assignedUserIds
    // Note: The service implementation constructs a virtual 'assignedUserIds' field for the diff
    const assignedUsersChange = logs[0].changes.find(c => c.field === 'assignedUserIds');
    expect(assignedUsersChange).toBeDefined();
    expect(assignedUsersChange?.oldValue).toEqual([]);
    expect(assignedUsersChange?.newValue).toEqual([userToAssign._id.toString()]);
  });

  it('should log AuditAction.DELETE when a client is deleted', async () => {
    // 1. Create Client
    const client = await clientModel.create({
      name: 'Delete Test Client',
      subsidiaryId: subsidiary._id,
      recordId: 'CLI003',
    });

    // 2. Delete Client
    await request(app.getHttpServer())
      .delete(`/clients/${client._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.CLIENT, resourceId: client._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.DELETE);
    expect(logs[0].metadata?.snapshot).toBeDefined();
    expect(logs[0].metadata?.snapshot.name).toBe('Delete Test Client');
  });
});
