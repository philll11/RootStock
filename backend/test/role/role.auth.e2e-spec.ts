// backend/test/role/role.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';

describe('Roles Auth (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Personas & Tokens
    let noPermissionsToken: string;
    let viewRoleToken: string;
    let editRoleToken: string;
    let createRoleToken: string;
    let deleteRoleToken: string;
    let manageInactiveToken: string;

    // Test Entities
    let testRole: RoleDocument;
    let inactiveRole: RoleDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get models
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Create roles with specific permissions
        const [viewRole, editRole, createRole, deleteRole, noPermissionsRole, manageInactiveRole] = await Promise.all([
            roleModel.create({ recordId: 'ROLE_VIEWER', name: 'Role Viewer', permissions: [PERMISSIONS.ROLE_VIEW], visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'ROLE_EDITOR', name: 'Role Editor', permissions: [PERMISSIONS.ROLE_EDIT], visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'ROLE_CREATOR', name: 'Role Creator', permissions: [PERMISSIONS.ROLE_CREATE], visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'ROLE_DELETER', name: 'Role Deleter', permissions: [PERMISSIONS.ROLE_DELETE], visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'ROLE_NO_PERMISSIONS', name: 'No Permissions', permissions: [], visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'ROLE_INACTIVE_MANAGER', name: 'Inactive Manager', permissions: [PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_EDIT, PERMISSIONS.ROLE_MANAGE_INACTIVE], visibilityScope: VisibilityScope.GLOBAL }),
        ]);

        // Create users for each role
        const [viewUser, editUser, createUser, deleteUser, noPermissionsUser, manageInactiveUser] = await Promise.all([
            userModel.create({ recordId: 'VIEW_USER', name: 'View User', firstName: 'View', lastName: 'User', email: 'viewer.auth@test.com', roleId: viewRole._id, userType: UserType.EMPLOYEE }),
            userModel.create({ recordId: 'EDIT_USER', name: 'Edit User', firstName: 'Edit', lastName: 'User', email: 'editor.auth@test.com', roleId: editRole._id, userType: UserType.EMPLOYEE }),
            userModel.create({ recordId: 'CREATE_USER', name: 'Create User', firstName: 'Create', lastName: 'User', email: 'creator.auth@test.com', roleId: createRole._id, userType: UserType.EMPLOYEE }),
            userModel.create({ recordId: 'DELETE_USER', name: 'Delete User', firstName: 'Delete', lastName: 'User', email: 'deleter.auth@test.com', roleId: deleteRole._id, userType: UserType.EMPLOYEE }),
            userModel.create({ recordId: 'NO_PERMS_USER', name: 'No Perms User', firstName: 'NoPerms', lastName: 'User', email: 'noperms.auth@test.com', roleId: noPermissionsRole._id, userType: UserType.EMPLOYEE }),
            userModel.create({ recordId: 'INACTIVE_MANAGER_USER', name: 'Inactive Manager', firstName: 'Inactive', lastName: 'Manager', email: 'inactive.manager.auth@test.com', roleId: manageInactiveRole._id, userType: UserType.EMPLOYEE }),
        ]);

        // Generate JWT tokens for each user
        viewRoleToken = jwtService.sign({ sub: viewUser.recordId, tokenVersion: 0 });
        editRoleToken = jwtService.sign({ sub: editUser.recordId, tokenVersion: 0 });
        createRoleToken = jwtService.sign({ sub: createUser.recordId, tokenVersion: 0 });
        deleteRoleToken = jwtService.sign({ sub: deleteUser.recordId, tokenVersion: 0 });
        noPermissionsToken = jwtService.sign({ sub: noPermissionsUser.recordId, tokenVersion: 0 });
        manageInactiveToken = jwtService.sign({ sub: manageInactiveUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Create a fresh set of roles for each test
        [testRole, inactiveRole] = await Promise.all([
            roleModel.create({
                recordId: 'TEST_ROLE_CRUD',
                name: 'Auth Test Role',
                permissions: [PERMISSIONS.CLIENT_VIEW],
                visibilityScope: VisibilityScope.CLIENT,
            }),
            roleModel.create({
                recordId: 'INACTIVE_TEST_ROLE_CRUD',
                name: 'Inactive Auth Test Role',
                permissions: [PERMISSIONS.CLIENT_VIEW],
                visibilityScope: VisibilityScope.CLIENT,
                isActive: false,
            }),
        ]);
    });

    afterEach(async () => {
        // Clean up created roles after each test, keeping the base roles
        await roleModel.deleteMany({ recordId: { $in: ['TEST_ROLE_CRUD', 'INACTIVE_TEST_ROLE_CRUD'] } });
    });

    describe('Standard Action Permissions', () => {
        // --- UNAUTHORIZED / FORBIDDEN CHECKS ---
        it('should return 403 for POST /roles with insufficient permissions', async () => {
            await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${viewRoleToken}`) // Has VIEW, not CREATE
                .send({ name: 'Auth Test Create', permissions: [], visibilityScope: VisibilityScope.CLIENT })
                .expect(403);
        });

        it('should return 403 for GET /roles with insufficient permissions', async () => {
            await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${noPermissionsToken}`)
                .expect(403);
        });

        it('should return 403 for PATCH /roles/:id with insufficient permissions', async () => {
            await request(app.getHttpServer())
                .patch(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${viewRoleToken}`) // Has VIEW, not EDIT
                .send({ name: 'Auth Test Patch' })
                .expect(403);
        });

        it('should return 403 for DELETE /roles/:id with insufficient permissions', async () => {
            await request(app.getHttpServer())
                .delete(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${editRoleToken}`) // Has EDIT, not DELETE
                .expect(403);
        });

        // --- AUTHORIZED / SUCCESS CHECKS ---
        it('should return 201 for POST /roles with sufficient permissions', async () => {
            await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${createRoleToken}`)
                .send({ name: 'Auth Test Create', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.CLIENT })
                .expect(201);
        });

        it('should return 200 for GET /roles with sufficient permissions', async () => {
            await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${viewRoleToken}`)
                .expect(200);
        });

        it('should return 200 for GET /roles/:id with sufficient permissions', async () => {
            await request(app.getHttpServer())
                .get(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${viewRoleToken}`)
                .expect(200);
        });

        it('should return 200 for PATCH /roles/:id with sufficient permissions', async () => {
            await request(app.getHttpServer())
                .patch(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${editRoleToken}`)
                .send({ name: 'Auth Test Patch', __v: testRole.__v })
                .expect(200);
        });

        it('should return 200 for DELETE /roles/:id with sufficient permissions', async () => {
            await request(app.getHttpServer())
                .delete(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${deleteRoleToken}`)
                .expect(200);
        });
    });


    describe('Inactive Record Permissions (ROLE_MANAGE_INACTIVE)', () => {
        it('should ALLOW user with permission to view inactive roles in list', async () => {
            const response = await request(app.getHttpServer())
                .get('/roles?includeInactives=true')
                .set('Authorization', `Bearer ${manageInactiveToken}`)
                .expect(200);

            const inactiveRoleInList = response.body.find(r => r.name === 'Inactive Auth Test Role');
            expect(inactiveRoleInList).toBeDefined();
            expect(inactiveRoleInList.isActive).toBe(false);
        });

        it('should DENY user without permission from viewing inactive roles in list', async () => {
            const response = await request(app.getHttpServer())
                .get('/roles?includeInactives=true')
                .set('Authorization', `Bearer ${viewRoleToken}`) // Has VIEW but not MANAGE_INACTIVE
                .expect(200);

            const inactiveRoleInList = response.body.find(r => r.name === 'Inactive Auth Test Role');
            expect(inactiveRoleInList).toBeUndefined();
        });

        it('should ALLOW user with permission to access inactive role by ID', async () => {
            await request(app.getHttpServer())
                .get(`/roles/${inactiveRole._id}?includeInactives=true`)
                .set('Authorization', `Bearer ${manageInactiveToken}`)
                .expect(200);
        });

        it('should DENY user without permission from accessing inactive role by ID', async () => {
            await request(app.getHttpServer())
                .get(`/roles/${inactiveRole._id}?includeInactives=true`)
                .set('Authorization', `Bearer ${viewRoleToken}`)
                .expect(404);
        });

        it('should ALLOW user with permission to reactivate an inactive role', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/roles/${inactiveRole._id}`)
                .set('Authorization', `Bearer ${manageInactiveToken}`)
                .send({ isActive: true, __v: inactiveRole.__v })
                .expect(200);

            expect(response.body.isActive).toBe(true);
        });

        it('should DENY user without permission from reactivating an inactive role', async () => {
            await request(app.getHttpServer())
                .patch(`/roles/${inactiveRole._id}`)
                .set('Authorization', `Bearer ${editRoleToken}`) // Has EDIT but not MANAGE_INACTIVE
                .send({ isActive: true, __v: inactiveRole.__v })
                .expect(404);
        });
    });

    it('should return 401 for any request without a token', async () => {
        await request(app.getHttpServer()).get('/roles').expect(401);
    });
});