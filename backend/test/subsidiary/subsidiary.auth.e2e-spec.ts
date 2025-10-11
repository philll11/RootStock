import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CreateSubsidiaryDto } from '../../src/subsidiaries/dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';

describe('Subsidiaries Authorization - Security Model (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Business personas for realistic authorization testing
    let platformAdminToken: string; // Global admin with all permissions
    let subsidiaryManagerToken: string; // Limited permissions
    let readOnlyToken: string; // View-only access
    let noPermissionsToken: string; // Valid user, no relevant permissions

    // Test entities
    let activeSubsidiary: SubsidiaryDocument;
    let inactiveSubsidiary: SubsidiaryDocument;
    let deletedSubsidiary: SubsidiaryDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create roles
        const [adminRole, managerRole, readOnlyRole, noPermsRole] = await roleModel.create([
            { recordId: 'ROLE_ADMIN_SUB_AUTH', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_MANAGER_SUB_AUTH', name: 'Manager', permissions: [PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_READONLY_SUB_AUTH', name: 'ReadOnly', permissions: [PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.VIEW_DELETED], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_NOPERMS_SUB_AUTH', name: 'NoPerms', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.GLOBAL },
        ]);

        // Create users
        const [adminUser, managerUser, readOnlyUser, noPermsUser] = await userModel.create([
            { recordId: 'USER_ADMIN_SUB_AUTH', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin.sub.auth@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'USER_MANAGER_SUB_AUTH', name: 'Manager', firstName: 'Manager', lastName: 'User', email: 'manager.sub.auth@test.com', userType: UserType.EMPLOYEE, roleId: managerRole._id },
            { recordId: 'USER_READONLY_SUB_AUTH', name: 'ReadOnly', firstName: 'ReadOnly', lastName: 'User', email: 'readonly.sub.auth@test.com', userType: UserType.EMPLOYEE, roleId: readOnlyRole._id },
            { recordId: 'USER_NOPERMS_SUB_AUTH', name: 'NoPerms', firstName: 'NoPerms', lastName: 'User', email: 'noperms.sub.auth@test.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id },
        ]);

        // Generate tokens
        platformAdminToken = jwtService.sign({ sub: adminUser.recordId });
        subsidiaryManagerToken = jwtService.sign({ sub: managerUser.recordId });
        readOnlyToken = jwtService.sign({ sub: readOnlyUser.recordId });
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });

        [activeSubsidiary, inactiveSubsidiary, deletedSubsidiary] = await subsidiaryModel.create([
            { recordId: 'SUB_AUTH_ACTIVE', name: 'Auth Active Sub' },
            { recordId: 'SUB_AUTH_INACTIVE', name: 'Auth Inactive Sub', isActive: false },
            { recordId: 'SUB_AUTH_DELETED', name: 'Auth Deleted Sub', isDeleted: true, isActive: false },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    beforeEach(async () => {
        // Reset only the state that could be modified by tests, preserving roles and users
        await subsidiaryModel.deleteMany({ recordId: { $nin: ['SUB_AUTH_ACTIVE', 'SUB_AUTH_INACTIVE', 'SUB_AUTH_DELETED'] } });
        await subsidiaryModel.updateMany({}, { isDeleted: false, isActive: true });
        await subsidiaryModel.updateOne({ recordId: 'SUB_AUTH_INACTIVE' }, { isActive: false });
        await subsidiaryModel.updateOne({ recordId: 'SUB_AUTH_DELETED' }, { isDeleted: true, isActive: false });
    });

    describe('Action-Level Permission Enforcement', () => {
        it('should DENY creation for a user without SUBSIDIARY_CREATE', async () => {
            const createDto: CreateSubsidiaryDto = { name: 'Unauthorized Create' };
            await request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${subsidiaryManagerToken}`).send(createDto).expect(403);
        });

        it('should DENY editing for a user without SUBSIDIARY_EDIT', async () => {
            const updateDto: UpdateSubsidiaryDto = { name: 'Unauthorized Edit' };
            await request(app.getHttpServer()).patch(`/subsidiaries/${activeSubsidiary._id}`).set('Authorization', `Bearer ${readOnlyToken}`).send(updateDto).expect(403);
        });

        it('should DENY deletion for a user without SUBSIDIARY_DELETE', async () => {
            await request(app.getHttpServer()).delete(`/subsidiaries/${activeSubsidiary._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(403);
        });

        it('should DENY viewing for a user without SUBSIDIARY_VIEW', async () => {
            await request(app.getHttpServer()).get('/subsidiaries').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });
    });

    describe('Field-Level & Inactive Record Permission Enforcement', () => {
        it('should DENY status updates for a user without SUBSIDIARY_MANAGE_INACTIVE', async () => {
            const updateDto: UpdateSubsidiaryDto = { isActive: false };
            await request(app.getHttpServer()).patch(`/subsidiaries/${activeSubsidiary._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).send(updateDto).expect(403);
        });

        it('should ALLOW status updates for a user with SUBSIDIARY_MANAGE_INACTIVE', async () => {
            const updateDto: UpdateSubsidiaryDto = { isActive: false };
            await request(app.getHttpServer()).patch(`/subsidiaries/${activeSubsidiary._id}`).set('Authorization', `Bearer ${platformAdminToken}`).send(updateDto).expect(200);
        });

        it('should DENY access to inactive subsidiaries in list view without permission', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries?includeInactives=true').set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(200);
            expect(res.body.find(s => s.recordId === inactiveSubsidiary.recordId)).toBeUndefined();
        });

        it('should ALLOW access to inactive subsidiaries in list view with permission', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries?includeInactives=true').set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            expect(res.body.find(s => s.recordId === inactiveSubsidiary.recordId)).toBeDefined();
        });

        it('should DENY access to inactive subsidiary by ID without permission', async () => {
            await request(app.getHttpServer()).get(`/subsidiaries/${inactiveSubsidiary._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(404);
        });

        it('should ALLOW access to inactive subsidiary by ID with permission', async () => {
            await request(app.getHttpServer()).get(`/subsidiaries/${inactiveSubsidiary._id}?includeInactives=true`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
        });
    });

    describe('Deleted Record Permission Enforcement', () => {
        it('should DENY access to deleted subsidiaries in list view without VIEW_DELETED', async () => {
            await request(app.getHttpServer()).get('/subsidiaries?isDeleted=true').set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(403);
        });

        it('should ALLOW access to deleted subsidiaries in list view with VIEW_DELETED', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries?isDeleted=true').set('Authorization', `Bearer ${readOnlyToken}`).expect(200);
            
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe(deletedSubsidiary.recordId);
        });

        it('should DENY access to deleted subsidiary by ID without VIEW_DELETED', async () => {
            await request(app.getHttpServer()).get(`/subsidiaries/${deletedSubsidiary._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(404);
        });

        it.todo('should ALLOW access to deleted subsidiary by ID with VIEW_DELETED - Requires implementation');
    });
});