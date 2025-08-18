import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles CRUD - Administrator-Only Functionality (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let clientModel: Model<any>;
    let subsidiaryModel: Model<any>;

    // Test users representing the REAL business model
    let globalAdminToken: string; // ONLY user who can manage roles
    let subsidiaryConsultantToken: string; // Should be blocked from role operations
    let clientGrowerToken: string; // Should be blocked from role operations
    let fieldWorkerToken: string; // Should be blocked from role operations
    
    // Test entities for negative testing scenarios
    let testSubsidiary: any;
    let clientA: any;
    let clientB: any;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        clientModel = app.get<Model<any>>(getModelToken('Client'));
        subsidiaryModel = app.get<Model<any>>(getModelToken('Subsidiary'));

        // Create realistic business hierarchy for negative testing
        testSubsidiary = await new subsidiaryModel({
            recordId: 'SUB001',
            name: 'Test Subsidiary'
        }).save();

        clientA = await new clientModel({
            recordId: 'CLI001',
            name: 'Green Valley Orchards',
            subsidiaryId: testSubsidiary._id
        }).save();

        clientB = await new clientModel({
            recordId: 'CLI002',
            name: 'Sunset Fruit Farms', 
            subsidiaryId: testSubsidiary._id
        }).save();

        // Create roles matching the REAL system design (from seed.ts)
        const globalAdminRole = await new roleModel({
            recordId: 'ADMIN_ROLE',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // ALL permissions including role management
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const consultantRole = await new roleModel({
            recordId: 'CONSULTANT_ROLE',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: NO role management permissions
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const growerRole = await new roleModel({
            recordId: 'GROWER_ROLE',
            name: 'Orchard Grower/Owner',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: NO role management permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const fieldWorkerRole = await new roleModel({
            recordId: 'WORKER_ROLE',
            name: 'Field Worker',
            permissions: [
                'Spray:Create', 'Spray:View',
                // NOTE: NO role or user management permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create test users representing real business stakeholders
        const globalAdmin = await new userModel({
            recordId: 'GLOBAL_ADMIN',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Admin',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            clientIds: [] // Global access
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUB_CONSULTANT',
            name: 'Subsidiary Consultant',
            firstName: 'Agricultural',
            lastName: 'Consultant',
            userType: UserType.EMPLOYEE,
            roleId: consultantRole._id,
            clientIds: [clientA._id, clientB._id] // Works with multiple clients
        }).save();
        subsidiaryConsultantToken = jwtService.sign({ sub: subsidiaryConsultant.recordId });

        const clientGrowerUser = await new userModel({
            recordId: 'CLIENT_GROWER',
            name: 'Orchard Grower',
            firstName: 'John',
            lastName: 'Appleton',
            userType: UserType.CONTACT,
            roleId: growerRole._id,
            clientIds: [clientA._id] // Only their own orchard
        }).save();
        clientGrowerToken = jwtService.sign({ sub: clientGrowerUser.recordId });

        const fieldWorker = await new userModel({
            recordId: 'FIELD_WORKER',
            name: 'Field Worker',
            firstName: 'Tom',
            lastName: 'Picker',
            userType: UserType.CONTACT,
            roleId: fieldWorkerRole._id,
            clientIds: [clientA._id] // Works for specific client
        }).save();
        fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created roles, preserve setup roles
        await roleModel.deleteMany({ 
            recordId: { $nin: ['ADMIN_ROLE', 'CONSULTANT_ROLE', 'GROWER_ROLE', 'WORKER_ROLE'] } 
        });
    });

    // REAL BUSINESS MODEL: Only Global Administrators can manage roles
    describe('Administrator-Only Role Management (Positive Testing)', () => {
        it('should allow global administrator to create roles', async () => {
            const newRole = {
                name: 'Custom Business Role',
                description: 'A custom role created by administrator',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Orchard:View', 'Spray:Create']
            };

            return request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newRole)
                .expect(201)
                .then(res => {
                    expect(res.body.recordId).toMatch(/^ROL\d+$/);
                    expect(res.body.name).toBe('Custom Business Role');
                    expect(res.body.visibilityScope).toBe(VisibilityScope.CLIENT);
                });
        });

        it('should allow global administrator to view all roles', async () => {
            return request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(4); // At least our setup roles
                    const roleIds = res.body.map((role: any) => role.recordId);
                    expect(roleIds).toContain('ADMIN_ROLE');
                    expect(roleIds).toContain('CONSULTANT_ROLE');
                    expect(roleIds).toContain('GROWER_ROLE');
                });
        });

        it('should allow global administrator to update any role', async () => {
            const testRole = await new roleModel({
                recordId: 'TEST_UPDATABLE',
                name: 'Updatable Role',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission']
            }).save();

            return request(app.getHttpServer())
                .patch(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ name: 'Updated by Administrator' })
                .expect(200)
                .then(res => {
                    expect(res.body.name).toBe('Updated by Administrator');
                });
        });

        it('should allow global administrator to delete roles', async () => {
            const testRole = await new roleModel({
                recordId: 'TEST_DELETABLE',
                name: 'Deletable Role',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission']
            }).save();

            // Delete should succeed
            await request(app.getHttpServer())
                .delete(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Role should be soft-deleted (not accessible)
            await request(app.getHttpServer())
                .get(`/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });

    describe('Security Enforcement: Non-Administrator Access Denied (Negative Testing)', () => {
        describe('Subsidiary Consultant - Should Be Completely Blocked from Role Management', () => {
            it('should prevent consultant from creating roles (403 Forbidden)', async () => {
                const unauthorizedRole = {
                    name: 'Unauthorized Role Creation',
                    visibilityScope: VisibilityScope.CLIENT,
                    permissions: ['Orchard:View']
                };

                // Consultant lacks ROLE_CREATE permission
                return request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(unauthorizedRole)
                    .expect(403);
            });

            it('should return 403 FORBIDDEN for consultant viewing roles (lacks ROLE_VIEW permission)', async () => {
                // REAL SYSTEM: Consultants do NOT have ROLE_VIEW permission per seed.ts
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should return 403 FORBIDDEN for consultant accessing specific role details', async () => {
                const adminRole = await roleModel.findOne({ recordId: 'ADMIN_ROLE' });
                
                // Blocked at permission level before reaching visibility filtering
                return request(app.getHttpServer())
                    .get(`/roles/${adminRole!._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // @RequirePermission('Role:View') blocks this
            });

            it('should return 403 FORBIDDEN for consultant updating roles', async () => {
                const adminRole = await roleModel.findOne({ recordId: 'ADMIN_ROLE' });
                
                return request(app.getHttpServer())
                    .patch(`/roles/${adminRole!._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send({ name: 'Unauthorized Update' })
                    .expect(403); // @RequirePermission('Role:Edit') blocks this
            });

            it('should return 403 FORBIDDEN for consultant deleting roles', async () => {
                const adminRole = await roleModel.findOne({ recordId: 'ADMIN_ROLE' });
                
                return request(app.getHttpServer())
                    .delete(`/roles/${adminRole!._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // @RequirePermission('Role:Delete') blocks this
            });
        });

        describe('Client Grower - Should Be Completely Blocked from Role Management', () => {
            it('should prevent grower from creating roles (403 Forbidden)', async () => {
                const fieldWorkerRole = {
                    name: 'Unauthorized Field Worker Role',
                    visibilityScope: VisibilityScope.CLIENT,
                    permissions: ['Spray:Create']
                };

                // This is a key business rule: Growers CANNOT create roles for their workers
                return request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(fieldWorkerRole)
                    .expect(403);
            });

            it('should prevent grower from viewing any roles (empty list)', async () => {
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should prevent grower from accessing their own role details (404)', async () => {
                const growerRole = await roleModel.findOne({ recordId: 'GROWER_ROLE' });
                
                // Even their own role is hidden from them
                return request(app.getHttpServer())
                    .get(`/roles/${growerRole!._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403);
            });

            it('should prevent grower from modifying any roles (404)', async () => {
                const growerRole = await roleModel.findOne({ recordId: 'GROWER_ROLE' });
                
                return request(app.getHttpServer())
                    .patch(`/roles/${growerRole!._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send({ name: 'Modified Grower Role' })
                    .expect(403);
            });
        });

        describe('Field Worker - Should Be Completely Blocked from Role Management', () => {
            it('should prevent field worker from any role creation attempts (403)', async () => {
                const testRole = {
                    name: 'Worker Attempt Role',
                    visibilityScope: VisibilityScope.CLIENT,
                    permissions: ['Basic:Permission']
                };

                return request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .send(testRole)
                    .expect(403);
            });

            it('should prevent field worker from viewing roles (empty list)', async () => {
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should prevent field worker from accessing any role via direct ID (404)', async () => {
                const workerRole = await roleModel.findOne({ recordId: 'WORKER_ROLE' });
                
                return request(app.getHttpServer())
                    .get(`/roles/${workerRole!._id}`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403);
            });
        });
    });

    describe('Business Rule Validation - Real Role Management Scenarios', () => {
        it('should enforce role deactivation business rules', async () => {
            // Create a role with active users
            const roleWithUsers = await new roleModel({
                recordId: 'ROLE_WITH_ACTIVE_USERS',
                name: 'Role with Active Users',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission']
            }).save();

            // Create an active user assigned to this role
            await new userModel({
                recordId: 'ACTIVE_ASSIGNED_USER',
                name: 'Active User',
                firstName: 'Active',
                lastName: 'User',
                userType: UserType.CONTACT,
                roleId: roleWithUsers._id,
                clientIds: [clientA._id],
                isActive: true
            }).save();

            // Should prevent deactivation due to active users
            return request(app.getHttpServer())
                .patch(`/roles/${roleWithUsers._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it');
                });
        });

        it('should handle role deletion with user cleanup transaction', async () => {
            const roleToDelete = await new roleModel({
                recordId: 'ROLE_FOR_DELETION_TEST',
                name: 'Role for Deletion',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Temp:Permission']
            }).save();

            // Create users assigned to this role
            const assignedUser = await new userModel({
                recordId: 'USER_FOR_DELETION_TEST',
                name: 'User to be Cleaned',
                firstName: 'Test',
                lastName: 'User',
                userType: UserType.CONTACT,
                roleId: roleToDelete._id,
                clientIds: [clientA._id]
            }).save();

            // Delete the role
            await request(app.getHttpServer())
                .delete(`/roles/${roleToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify user's roleId was nullified in transaction
            const updatedUser = await userModel.findById(assignedUser._id);
            expect(updatedUser?.roleId).toBeNull();
        });

        it('should validate proper role data creation by administrator', async () => {
            const completeRole = {
                name: 'Comprehensive Test Role',
                description: 'Complete role with all fields',
                visibilityScope: VisibilityScope.SUBSIDIARY,
                permissions: [
                    PERMISSIONS.CLIENT_VIEW,
                    PERMISSIONS.ORCHARD_VIEW,
                    'Custom:Permission'
                ]
            };

            return request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(completeRole)
                .expect(201)
                .then(res => {
                    expect(res.body.recordId).toMatch(/^ROL\d+$/);
                    expect(res.body.name).toBe('Comprehensive Test Role');
                    expect(res.body.description).toBe('Complete role with all fields');
                    expect(res.body.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
                    expect(res.body.permissions).toEqual(completeRole.permissions);
                    expect(res.body.isActive).toBe(true);
                    expect(res.body.isDeleted).toBe(false);
                });
        });
    });
});
