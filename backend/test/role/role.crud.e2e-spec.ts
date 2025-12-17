// backend/test/role/role.crud.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';

describe('Roles CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Personas
    let globalAdminToken: string;

    // Test Entities
    let testRole: RoleDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

        // Get models
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Create a single admin role with all permissions for testing
        const globalAdminRole = await roleModel.create({
            recordId: 'GLOBAL_ADMIN_CRUD',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL,
        });

        // Create a single admin user
        const globalAdmin = await userModel.create({
            recordId: 'ADMIN_USER_CRUD',
            name: 'Global Admin',
            firstName: 'Global',
            lastName: 'Admin',
            email: 'global.admin.crud@test.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
        });
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up any roles created during tests
        await roleModel.deleteMany({ recordId: { $ne: 'GLOBAL_ADMIN_CRUD' } });
        testRole = await roleModel.create({
            recordId: 'TEST_ROLE_CRUD',
            name: 'Test Role',
            description: 'A role for testing PATCH and DELETE',
            permissions: [PERMISSIONS.CLIENT_VIEW],
            visibilityScope: VisibilityScope.CLIENT,
        });
    });

    describe('POST /roles', () => {
        it('should create a new role successfully', async () => {
            const newRoleDto = {
                name: 'New Field Supervisor',
                description: 'Supervises field operations',
                permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT],
                visibilityScope: VisibilityScope.CLIENT,
            };

            const response = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newRoleDto)
                .expect(201);

            expect(response.body).toMatchObject({
                ...newRoleDto,
                recordId: expect.stringMatching(/^ROL\d+$/),
                isActive: true,
                isDeleted: false,
            });
        });

        describe('Validation', () => {
            it('should return 400 on missing name', async () => {
                const invalidDto = {
                    description: 'Missing name',
                    permissions: [PERMISSIONS.CLIENT_VIEW],
                    visibilityScope: VisibilityScope.CLIENT,
                };
                await request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400);
            });

            it('should return 400 on invalid visibilityScope', async () => {
                const invalidDto = {
                    name: 'Invalid Scope Role',
                    permissions: [PERMISSIONS.CLIENT_VIEW],
                    visibilityScope: 'INVALID_SCOPE',
                };
                await request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400);
            });

            it('should return 400 on invalid permissions (not an array)', async () => {
                const invalidDto = {
                    name: 'Invalid Permissions Role',
                    permissions: 'not-an-array',
                    visibilityScope: VisibilityScope.CLIENT,
                };
                await request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400);
            });
        });
    });

    describe('GET /roles', () => {
        it('should return a list of roles', async () => {
            const response = await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // Admin role + test role
            expect(response.body.some(r => r.recordId === 'GLOBAL_ADMIN_CRUD')).toBe(true);
        });
    });

    describe('GET /roles/:id', () => {
        it('should return a single role by its ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.name).toBe('Test Role');
            expect(response.body.recordId).toBe(testRole.recordId);
        });

        it('should return 404 for a non-existent role ID', async () => {
            const nonExistentId = '60f7e2a3b3e3b3e3b3e3b3e3'; // Valid ObjectId format, but does not exist
            await request(app.getHttpServer())
                .get(`/roles/${nonExistentId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /roles/:id', () => {
        it('should update a role successfully', async () => {
            const updateDto = {
                name: 'Updated Test Role Name',
                description: 'Updated description.',
                __v: testRole.__v,
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.name).toBe('Updated Test Role Name');
            expect(response.body.description).toBe('Updated description.');
            expect(response.body.__v).toBe(testRole.__v + 1);
        });

        it('should return 409 for a version mismatch (Optimistic Concurrency)', async () => {
            const updateDto = {
                name: 'Stale Update',
                __v: testRole.__v - 1, // Stale version
            };

            await request(app.getHttpServer())
                .patch(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(409);
        });
    });

    describe('DELETE /roles/:id', () => {
        it('should soft-delete a role successfully', async () => {
            await request(app.getHttpServer())
                .delete(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify it's soft-deleted
            const deletedRole = await roleModel.findById(testRole._id);
            expect(deletedRole).not.toBeNull();
            expect(deletedRole!.isDeleted).toBe(true);

            // Verify it's no longer returned by a standard GET request
            await request(app.getHttpServer())
                .get(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });
});
