import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { AuditEntry, AuditEntryDocument, AuditAction } from '../../src/system/audits/schemas/audit.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';
import { AuditsService } from '../../src/system/audits/audits.service';

describe('Audits Resource (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let jwtService: JwtService;
  let auditsService: AuditsService;

  // Models
  let clientModel: Model<ClientDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let subsidiaryModel: Model<SubsidiaryDocument>;
  let systemConfigModel: Model<SystemConfigDocument>;

  // Tokens
  let adminToken: string;
  let managerToken: string;
  let ownerToken: string;

  // Test Data
  let subA: SubsidiaryDocument, subB: SubsidiaryDocument;
  let clientA: ClientDocument, clientB: ClientDocument, clientC: ClientDocument;
  let adminUser: UserDocument, managerUser: UserDocument, ownerUser: UserDocument;

  jest.setTimeout(60000);

  beforeAll(async () => {
    ({ app, mongod, jwtService } = await setupTestApp());
    
    auditsService = app.get<AuditsService>(AuditsService);
    clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
    systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));

    // 0. Seed System Config (Enable Auditing)
    await systemConfigModel.create({
      key: 'audit',
      value: { enabled: true },
      description: 'Test Audit Config',
      isActive: true
    });
    subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

    // 1. Setup Hierarchy
    [subA, subB] = await subsidiaryModel.create([
      { recordId: 'SUB_A', name: 'Subsidiary A' },
      { recordId: 'SUB_B', name: 'Subsidiary B' },
    ]);

    [clientA, clientB, clientC] = await clientModel.create([
      { recordId: 'CLI_A', name: 'Client A (Sub A)', subsidiaryId: subA._id },
      { recordId: 'CLI_B', name: 'Client B (Sub A)', subsidiaryId: subA._id },
      { recordId: 'CLI_C', name: 'Client C (Sub B)', subsidiaryId: subB._id },
    ]);

    // 2. Setup Roles
    const [adminRole, managerRole, ownerRole] = await roleModel.create([
      { 
        recordId: 'ADMIN', 
        name: 'Admin', 
        permissions: [PERMISSIONS.AUDIT_VIEW], 
        visibilityScope: VisibilityScope.GLOBAL 
      },
      { 
        recordId: 'MANAGER', 
        name: 'Manager', 
        permissions: [PERMISSIONS.AUDIT_VIEW], 
        visibilityScope: VisibilityScope.SUBSIDIARY 
      },
      { 
        recordId: 'OWNER', 
        name: 'Owner', 
        permissions: [PERMISSIONS.AUDIT_VIEW], 
        visibilityScope: VisibilityScope.CLIENT 
      },
    ]);

    // 3. Setup Users
    [adminUser, managerUser, ownerUser] = await userModel.create([
      { 
        recordId: 'ADMIN_USER', 
        name: 'Admin User', 
        firstName: 'Admin', 
        lastName: 'User', 
        email: 'admin@test.com', 
        userType: UserType.EMPLOYEE, 
        roleId: adminRole._id 
      },
      { 
        recordId: 'MANAGER_USER', 
        name: 'Manager User', 
        firstName: 'Manager', 
        lastName: 'User', 
        email: 'manager@test.com', 
        userType: UserType.EMPLOYEE, 
        roleId: managerRole._id, 
        clientIds: [clientA._id] // Access to Sub A via Client A
      },
      { 
        recordId: 'OWNER_USER', 
        name: 'Owner User', 
        firstName: 'Owner', 
        lastName: 'User', 
        email: 'owner@test.com', 
        userType: UserType.EMPLOYEE, 
        roleId: ownerRole._id, 
        clientIds: [clientA._id] // Access only to Client A
      },
    ]);

    adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
    managerToken = jwtService.sign({ sub: managerUser.recordId, tokenVersion: 0 });
    ownerToken = jwtService.sign({ sub: ownerUser.recordId, tokenVersion: 0 });

    // 4. Seed Audit Logs
    // We manually seed logs because we want to test the READ capability of the Audits resource,
    // not necessarily the write capability of other resources (which is tested in their own specs).
    await auditsService.log(Resource.CLIENT, clientA._id.toString(), AuditAction.UPDATE, { name: 'Old' }, { name: 'New' }, adminUser._id.toString(), 'Test Update A');
    await auditsService.log(Resource.CLIENT, clientB._id.toString(), AuditAction.UPDATE, { name: 'Old' }, { name: 'New' }, adminUser._id.toString(), 'Test Update B');
    await auditsService.log(Resource.CLIENT, clientC._id.toString(), AuditAction.UPDATE, { name: 'Old' }, { name: 'New' }, adminUser._id.toString(), 'Test Update C');
  });

  afterAll(async () => await teardownTestApp({ app, mongod }));

  describe('GET /system/audit/:resource/:id', () => {
    
    // --- GLOBAL ADMIN ---
    it('Global Admin should see audit logs for ANY client', async () => {
      // Client A
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientA._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].resourceId).toBe(clientA._id.toString());
        });

      // Client C (Different Subsidiary)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientC._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    // --- SUBSIDIARY MANAGER ---
    it('Subsidiary Manager should see logs for clients in their subsidiary', async () => {
      // Client A (Same Sub)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientA._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Client B (Same Sub)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientB._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('Subsidiary Manager should NOT see logs for clients in other subsidiaries', async () => {
      // Client C (Different Sub)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientC._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404); // Service throws NotFoundException when access is denied
    });

    // --- CLIENT OWNER ---
    it('Client Owner should see logs for their assigned client', async () => {
      // Client A (Assigned)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientA._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('Client Owner should NOT see logs for other clients in same subsidiary', async () => {
      // Client B (Same Sub, Not Assigned)
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientB._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    // --- ERROR HANDLING ---
    it('should return 400 for invalid MongoID', async () => {
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/invalid-id`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 403 if user lacks AUDIT_VIEW permission', async () => {
      // Create a user without permission
      const noPermRole = await roleModel.create({ recordId: 'NO_PERM', name: 'No Perm', permissions: [], visibilityScope: VisibilityScope.GLOBAL });
      const noPermUser = await userModel.create({ recordId: 'NO_PERM', name: 'No Perm', firstName: 'No', lastName: 'Perm', email: 'noperm@test.com', userType: UserType.EMPLOYEE, roleId: noPermRole._id });
      const noPermToken = jwtService.sign({ sub: noPermUser.recordId, tokenVersion: 0 });

      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.CLIENT}/${clientA._id}`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });
  });
});
