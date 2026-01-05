import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { AuditEntry, AuditEntryDocument, AuditAction } from '../../src/system/audits/schemas/audit.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';

describe('Users Audit Integration (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let jwtService: JwtService;

  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let auditModel: Model<AuditEntryDocument>;
  let systemConfigModel: Model<SystemConfigDocument>;

  let adminToken: string;
  let adminUser: UserDocument;
  let adminRole: RoleDocument;
  let employeeRole: RoleDocument;

  jest.setTimeout(30000);

  beforeAll(async () => {
    ({ app, mongod, jwtService } = await setupTestApp());

    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
    auditModel = app.get<Model<AuditEntryDocument>>(getModelToken(AuditEntry.name));
    systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));

    // 1. Enable Auditing in System Config
    await systemConfigModel.create({
      key: 'audit',
      value: { enabled: true },
      description: 'Global Audit Config',
      isSystem: true,
    });

    // 2. Create Admin Role
    adminRole = await roleModel.create({
      name: 'Admin',
      recordId: 'ROL001',
      permissions: [
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.USER_EDIT,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE_INACTIVE,
        PERMISSIONS.ROLE_VIEW, // Needed for role checks
      ],
      visibilityScope: VisibilityScope.GLOBAL,
    });

    // 3. Create Employee Role (for the user we will create/update/delete)
    employeeRole = await roleModel.create({
      name: 'Employee',
      recordId: 'ROL002',
      permissions: [],
      visibilityScope: VisibilityScope.GLOBAL,
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
    // We don't delete all users because we need the admin user for the token
    // But we should delete the test users created in each test
    await userModel.deleteMany({ _id: { $ne: adminUser._id } });
  });

  it('should log AuditAction.CREATE when a user is created', async () => {
    const createDto = {
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test.employee@example.com',
      userType: UserType.EMPLOYEE,
      roleId: employeeRole._id.toString(),
      password: 'Password123!',
    };

    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createDto)
      .expect(201);

    const createdUser = res.body;

    // Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.USER, resourceId: createdUser._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.CREATE);
    expect(logs[0].userId.toString()).toBe(adminUser._id.toString());
    expect(logs[0].reason).toBe('User Created');
  });

  it('should log AuditAction.UPDATE when a user is updated', async () => {
    // 1. Create User
    const user = await userModel.create({
      name: 'Update Test User',
      firstName: 'Update',
      lastName: 'Test User',
      email: 'update.test@example.com',
      roleId: employeeRole._id,
      userType: UserType.EMPLOYEE,
      recordId: 'USR002',
    });

    // 2. Update User
    const updateDto = {
      firstName: 'Updated Name',
      __v: user.__v,
    };

    await request(app.getHttpServer())
      .patch(`/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.USER, resourceId: user._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'firstName',
          oldValue: 'Update',
          newValue: 'Updated Name',
        }),
      ]),
    );
  });

  it('should log AuditAction.DELETE when a user is deleted', async () => {
    // 1. Create User
    const user = await userModel.create({
      name: 'Delete Test User',
      firstName: 'Delete',
      lastName: 'Test User',
      email: 'delete.test@example.com',
      roleId: employeeRole._id,
      userType: UserType.EMPLOYEE,
      recordId: 'USR003',
    });

    // 2. Delete User
    await request(app.getHttpServer())
      .delete(`/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Verify Audit Log
    const logs = await auditModel.find({ resource: Resource.USER, resourceId: user._id }).exec();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.DELETE);
    expect(logs[0].metadata?.snapshot).toBeDefined();
    expect(logs[0].metadata?.snapshot.email).toBe('delete.test@example.com');
  });
});
