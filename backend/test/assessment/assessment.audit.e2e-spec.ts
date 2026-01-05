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
import { Assessment, AssessmentDocument, AssessmentStatus, AssessmentType } from '../../src/operations/assessments/schemas/assessment.schema';
import { AuditEntry, AuditEntryDocument, AuditAction } from '../../src/system/audits/schemas/audit.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';

describe('Assessment Audit Integration (e2e)', () => {
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
  let assessmentModel: Model<AssessmentDocument>;
  let auditModel: Model<AuditEntryDocument>;
  let systemConfigModel: Model<SystemConfigDocument>;

  let adminToken: string;
  let adminUser: UserDocument;
  let subsidiary: SubsidiaryDocument;
  let client: ClientDocument;
  let orchard: OrchardDocument;
  let block: BlockDocument;
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
    assessmentModel = app.get<Model<AssessmentDocument>>(getModelToken(Assessment.name));
    auditModel = app.get<Model<AuditEntryDocument>>(getModelToken(AuditEntry.name));
    systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));

    // 1. Enable Auditing in System Config
    await systemConfigModel.create({
      key: 'audit',
      value: { enabled: true },
      description: 'Global Audit Config',
      isSystem: true,
    });

    // 2. Create Role with Assessment Permissions
    const adminRole = await roleModel.create({
      name: 'Admin',
      recordId: 'ROL001',
      permissions: [
        PERMISSIONS.ASSESSMENT_CREATE,
        PERMISSIONS.ASSESSMENT_VIEW,
        PERMISSIONS.ASSESSMENT_EDIT,
        PERMISSIONS.ASSESSMENT_DELETE,
        PERMISSIONS.BLOCK_VIEW,
        PERMISSIONS.ORCHARD_VIEW,
        PERMISSIONS.CLIENT_VIEW,
      ],
      visibilityScope: VisibilityScope.GLOBAL,
    });

    // 3. Create Hierarchical Structure
    subsidiary = await subsidiaryModel.create({
        name: 'Test Subsidiary',
        recordId: 'SUB001',
    });

    client = await clientModel.create({
        name: 'Test Client',
        subsidiaryId: subsidiary._id,
        recordId: 'CLI001',
    });

    orchard = await orchardModel.create({
        name: 'Test Orchard',
        clientId: client._id,
        recordId: 'ORC001',
        hectares: 10,
    });

    variety = await varietyModel.create({
        name: 'Test Variety',
        recordId: 'VAR001',
    });

    block = await blockModel.create({
        name: 'Test Block',
        orchardId: orchard._id,
        clientId: client._id, // Denormalized
        recordId: 'BLK001',
        hectares: 2,
        plantings: [{ varietyId: variety._id, treeCount: 100 }], // Required for Assessment Snapshot
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
      clientIds: [client._id],
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
    await assessmentModel.deleteMany({});
  });

  it('should log AuditAction.CREATE when an assessment is created', async () => {
    const createDto = {
      name: 'Audit Test Assessment',
      blockId: block._id.toString(),
      type: AssessmentType.HAIL,
      date: new Date().toISOString(),
      samples: [
        { rowNumber: 1, totalFruit: 100, damagedFruit: 10 }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/assessments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createDto)
      .expect(201);

    const created = res.body;

    // Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.ASSESSMENT, resourceId: created._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.CREATE);
    expect(logs[0].userId.toString()).toBe(adminUser._id.toString());
    expect(logs[0].reason).toBe('Assessment Created');
  });

  it('should log AuditAction.UPDATE when an assessment is updated', async () => {
    // 1. Create Assessment Directly
    const assessment = await assessmentModel.create({
        recordId: 'ASM-TEST-01',
        name: 'Update Test Assessment',
        blockId: block._id,
        clientId: client._id,
        varietyId: variety._id, // Snapshot
        type: AssessmentType.HAIL,
        date: new Date(),
        status: AssessmentStatus.IN_PROGRESS,
        samples: [{ rowNumber: 1, totalFruit: 50, damagedFruit: 5 }],
        summary: { totalSamples: 1, totalFruit: 50, totalDamaged: 5, averageDamagePercentage: 10 }
    });

    // 2. Update Assessment
    const updateDto = {
      name: 'Updated Assessment Name',
      __v: assessment.__v,
    };

    await request(app.getHttpServer())
      .patch(`/assessments/${assessment._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.ASSESSMENT, resourceId: assessment._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          oldValue: 'Update Test Assessment',
          newValue: 'Updated Assessment Name',
        }),
      ]),
    );
  });

  it('should log AuditAction.DELETE when an assessment is deleted', async () => {
    // 1. Create Assessment
    const assessment = await assessmentModel.create({
        recordId: 'ASM-TEST-02',
        name: 'Delete Test Assessment',
        blockId: block._id,
        clientId: client._id,
        varietyId: variety._id,
        type: AssessmentType.HAIL,
        date: new Date(),
        status: AssessmentStatus.PENDING,
    });

    // 2. Delete Assessment
    await request(app.getHttpServer())
      .delete(`/assessments/${assessment._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.ASSESSMENT, resourceId: assessment._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.DELETE);
    expect(logs[0].metadata?.snapshot).toBeDefined(); 
    expect(logs[0].metadata?.snapshot.name).toBe('Delete Test Assessment');
  });

  it('should track granular sample changes in audit log', async () => {
    // 1. Create Assessment with Samples
    const assessment = await assessmentModel.create({
      recordId: 'ASM-TEST-03',
      name: 'Sample Audit Test',
      blockId: block._id,
      clientId: client._id,
      varietyId: variety._id,
      type: AssessmentType.HAIL,
      date: new Date(),
      status: AssessmentStatus.IN_PROGRESS,
      samples: [
        { rowNumber: 1, totalFruit: 100, damagedFruit: 10 },
      ],
      summary: { totalSamples: 1, totalFruit: 100, totalDamaged: 10, averageDamagePercentage: 10 }
    });

    const sampleId = assessment.samples[0]['_id']; // Access the auto-generated _id

    // 2. Update Sample Data
    const updateDto = {
      samples: [
        // Update existing sample (pass _id)
        { _id: sampleId, rowNumber: 1, totalFruit: 100, damagedFruit: 50 }, 
        // Add new sample
        { rowNumber: 2, totalFruit: 50, damagedFruit: 0 }
      ],
      __v: assessment.__v,
    };

    await request(app.getHttpServer())
      .patch(`/assessments/${assessment._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log for Granularity
    const logs = await auditModel.find({ resource: Resource.ASSESSMENT, resourceId: assessment._id }).exec();
    expect(logs).toHaveLength(1);
    
    // Check Diff Engine Output
    const changes = logs[0].changes;
    
    // Expect change on the existing sample
    const sampleChange = changes.find(c => c.field.includes(`samples[_id=${sampleId}].damagedFruit`));
    expect(sampleChange).toBeDefined();
    if (sampleChange) {
        expect(sampleChange.oldValue).toBe(10);
        expect(sampleChange.newValue).toBe(50);
    }

    // Expect addition of new sample
    // Note: The specific output format depends on AuditDiffService implementation for arrays
    const newSampleChange = changes.find(c => c.field.includes('samples') && c.newValue?.rowNumber === 2);
    expect(newSampleChange).toBeDefined();
  });
});
