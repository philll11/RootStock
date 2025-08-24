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
    let inactiveAccessUserToken: string; // Has ROLE_MANAGE_INACTIVE permission for testing
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

        const inactiveAccessRole = await new roleModel({
            recordId: 'INACTIVE_ACCESS_ROLE',
            name: 'Role Inactive Manager',
            permissions: [
                PERMISSIONS.ROLE_VIEW,
                PERMISSIONS.ROLE_EDIT, // Need edit permission to modify isActive
                PERMISSIONS.ROLE_MANAGE_INACTIVE, // Key permission for inactive record access
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                // NOTE: Has inactive management and edit but not create/delete
            ],
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
            email: 'platform.admin@roles-test.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            clientIds: [] // Global access
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        const inactiveAccessUser = await new userModel({
            recordId: 'INACTIVE_ACCESS_USER',
            name: 'Role Inactive Manager',
            firstName: 'Inactive',
            lastName: 'Manager',
            email: 'inactive.manager@roles-test.com',
            userType: UserType.EMPLOYEE,
            roleId: inactiveAccessRole._id,
            isActive: true
        }).save();
        inactiveAccessUserToken = jwtService.sign({ sub: inactiveAccessUser.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUB_CONSULTANT',
            name: 'Subsidiary Consultant',
            firstName: 'Agricultural',
            lastName: 'Consultant',
            email: 'subsidiary.consultant@roles-test.com',
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
            email: 'john.appleton@roles-test.com',
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
            email: 'tom.picker@roles-test.com',
            userType: UserType.CONTACT,
            roleId: fieldWorkerRole._id,
            clientIds: [clientA._id] // Works for specific client
        }).save();
        fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created roles, preserve setup roles
        await roleModel.deleteMany({ 
            recordId: { $nin: ['ADMIN_ROLE', 'INACTIVE_ACCESS_ROLE', 'CONSULTANT_ROLE', 'GROWER_ROLE', 'WORKER_ROLE'] } 
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
                email: 'active.user@roles-test.com',
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
                email: 'test.user@roles-test.com',
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

    describe('ROLE_MANAGE_INACTIVE Permission Testing - Inactive Record Access Control', () => {
        let inactiveRole: RoleDocument;

        beforeEach(async () => {
            // Create an inactive role for testing
            inactiveRole = await new roleModel({
                recordId: 'ROLE_INACTIVE_PERM_TEST',
                name: 'Inactive Role for Permission Testing',
                description: 'Role for testing inactive permissions',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission'],
                isActive: false,
                isDeleted: false
            }).save();
        });

        afterEach(async () => {
            // Clean up test inactive role
            await roleModel.deleteOne({ recordId: 'ROLE_INACTIVE_PERM_TEST' });
        });

        describe('Users WITH ROLE_MANAGE_INACTIVE Permission', () => {
            it('should allow user with ROLE_MANAGE_INACTIVE to view inactive roles in list', async () => {
                return request(app.getHttpServer())
                    .get('/roles?includeInactives=true')
                    .set('Authorization', `Bearer ${inactiveAccessUserToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        const inactiveRoleInList = res.body.find(r => r.recordId === 'ROLE_INACTIVE_PERM_TEST');
                        expect(inactiveRoleInList).toBeDefined();
                        expect(inactiveRoleInList.isActive).toBe(false);
                    });
            });

            it('should allow user with ROLE_MANAGE_INACTIVE to access inactive role by ID', async () => {
                return request(app.getHttpServer())
                    .get(`/roles/${inactiveRole._id}?includeInactives=true`)
                    .set('Authorization', `Bearer ${inactiveAccessUserToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.recordId).toBe('ROLE_INACTIVE_PERM_TEST');
                        expect(res.body.isActive).toBe(false);
                        expect(res.body.name).toBe('Inactive Role for Permission Testing');
                    });
            });

            it('should allow user with ROLE_MANAGE_INACTIVE to reactivate inactive roles', async () => {
                return request(app.getHttpServer())
                    .patch(`/roles/${inactiveRole._id}`)
                    .set('Authorization', `Bearer ${inactiveAccessUserToken}`)
                    .send({ isActive: true })
                    .expect(200)
                    .then(res => {
                        expect(res.body.isActive).toBe(true);
                        expect(res.body.recordId).toBe('ROLE_INACTIVE_PERM_TEST');
                    });
            });

            it('should allow global admin (with ROLE_MANAGE_INACTIVE) to deactivate active roles', async () => {
                // Create a clean role with no dependencies for this test
                const cleanRole = await new roleModel({
                    recordId: 'ROLE_CLEAN_FOR_DEACTIVATION',
                    name: 'Clean Role for Deactivation',
                    description: 'Role that can be safely deactivated',
                    visibilityScope: VisibilityScope.CLIENT,
                    permissions: ['Test:Permission'],
                    isActive: true,
                    isDeleted: false
                }).save();

                return request(app.getHttpServer())
                    .patch(`/roles/${cleanRole._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ isActive: false })
                    .expect(200)
                    .then(res => {
                        expect(res.body.isActive).toBe(false);
                        expect(res.body.recordId).toBe('ROLE_CLEAN_FOR_DEACTIVATION');
                    });
            });
        });

        describe('Users WITHOUT ROLE_MANAGE_INACTIVE Permission', () => {
            it('should prevent consultant from accessing inactive roles (403 Forbidden - lacks ROLE_VIEW)', async () => {
                return request(app.getHttpServer())
                    .get('/roles?includeInactives=true')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should prevent consultant from accessing inactive role by ID (403 Forbidden)', async () => {
                return request(app.getHttpServer())
                    .get(`/roles/${inactiveRole._id}?includeInactives=true`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should prevent grower from accessing inactive roles (403 Forbidden)', async () => {
                return request(app.getHttpServer())
                    .get('/roles?includeInactives=true')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should prevent field worker from accessing inactive roles (403 Forbidden)', async () => {
                return request(app.getHttpServer())
                    .get('/roles?includeInactives=true')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            // Note: Since non-admin users don't have ROLE_VIEW permission at all,
            // they can't even attempt to modify isActive status. The permission check
            // for ROLE_VIEW happens before any ROLE_MANAGE_INACTIVE checks.
        });
    });

    describe('Role Lifecycle Operations & Data Consistency Validation', () => {
        it('should enforce role deactivation business rules when active users exist', async () => {
            // Create a role with active users
            const roleWithActiveUsers = await new roleModel({
                recordId: 'ROLE_WITH_ACTIVE_USERS_LIFECYCLE',
                name: 'Role with Active Users for Lifecycle',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission'],
                isActive: true,
                isDeleted: false
            }).save();

            // Create active users assigned to this role
            await Promise.all([
                new userModel({
                    recordId: 'USER_BLOCKING_ROLE_DEACTIVATION1',
                    name: 'User Blocking Deactivation 1',
                    firstName: 'Blocking1',
                    lastName: 'User',
                    email: 'blocking1.user@roles-test.com',
                    userType: UserType.CONTACT,
                    roleId: roleWithActiveUsers._id,
                    clientIds: [clientA._id],
                    isActive: true,
                    isDeleted: false
                }).save(),
                new userModel({
                    recordId: 'USER_BLOCKING_ROLE_DEACTIVATION2',
                    name: 'User Blocking Deactivation 2',
                    firstName: 'Blocking2',
                    lastName: 'User',
                    email: 'blocking2.user@roles-test.com',
                    userType: UserType.CONTACT,
                    roleId: roleWithActiveUsers._id,
                    clientIds: [clientA._id],
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);

            // Should prevent deactivation due to active users
            return request(app.getHttpServer())
                .patch(`/roles/${roleWithActiveUsers._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This role cannot be deactivated because it has 2 active user(s) assigned to it');
                });
        });

        it('should maintain data consistency during role lifecycle operations', async () => {
            // Arrange: Create a role with associated users for lifecycle testing
            const roleForLifecycleTest = await new roleModel({
                recordId: 'ROLE_LIFECYCLE_TEST',
                name: 'Role Lifecycle Test',
                description: 'Role for testing lifecycle operations',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission'],
                isActive: true,
                isDeleted: false
            }).save();

            // Create associated users
            const associatedUsers = await Promise.all([
                new userModel({
                    recordId: 'USER_LIFECYCLE_TEST1',
                    name: 'User for Lifecycle Test 1',
                    firstName: 'User1',
                    lastName: 'Lifecycle',
                    userType: UserType.CONTACT,
                    email: 'user1.lifecycle@roles-test.com',
                    roleId: roleForLifecycleTest._id,
                    clientIds: [clientA._id],
                    isActive: true,
                    isDeleted: false
                }).save(),
                new userModel({
                    recordId: 'USER_LIFECYCLE_TEST2',
                    name: 'User for Lifecycle Test 2',
                    firstName: 'User2',
                    lastName: 'Lifecycle',
                    userType: UserType.CONTACT,
                    email: 'user2.lifecycle@roles-test.com',
                    roleId: roleForLifecycleTest._id,
                    clientIds: [clientA._id],
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);

            // Act: Delete the role
            await request(app.getHttpServer())
                .delete(`/roles/${roleForLifecycleTest._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Assert: Verify data consistency is maintained
            
            // Role should be soft-deleted
            const deletedRole = await roleModel.findById(roleForLifecycleTest._id);
            expect(deletedRole?.isDeleted).toBe(true);
            expect(deletedRole?.isActive).toBe(false);

            // Associated users should have their roleId set to null
            for (const user of associatedUsers) {
                const updatedUser = await userModel.findById(user._id);
                expect(updatedUser?.roleId).toBeNull();
            }

            // Role should no longer be accessible via API
            return request(app.getHttpServer())
                .get(`/roles/${roleForLifecycleTest._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should handle role deactivation business logic properly', async () => {
            // Arrange: Create role with no active users (safe to deactivate)
            const roleForDeactivation = await new roleModel({
                recordId: 'ROLE_DEACTIVATION_TEST',
                name: 'Role Deactivation Test',
                description: 'Role that can be safely deactivated',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission'],
                isActive: true,
                isDeleted: false
            }).save();

            // Act: Deactivate the role
            await request(app.getHttpServer())
                .patch(`/roles/${roleForDeactivation._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(200);

            // Assert: Verify role is properly deactivated
            const deactivatedRole = await roleModel.findById(roleForDeactivation._id);
            expect(deactivatedRole?.isActive).toBe(false);
            expect(deactivatedRole?.isDeleted).toBe(false); // Should not be deleted, just deactivated

            // Role should not appear in normal queries
            const rolesResponse = await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            const foundRole = rolesResponse.body.find(r => r.recordId === 'ROLE_DEACTIVATION_TEST');
            expect(foundRole).toBeUndefined(); // Should be filtered out of normal queries
        });

        it('should validate business rules during role creation with proper permission validation', async () => {
            // Test that roles are created with valid permission sets
            
            // Test 1: Role with valid permissions
            const validRoleData = {
                name: 'Valid Role Test',
                description: 'Role with valid permissions',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: [
                    PERMISSIONS.CLIENT_VIEW,
                    PERMISSIONS.ORCHARD_VIEW,
                    PERMISSIONS.USER_VIEW
                ]
            };

            await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(validRoleData)
                .expect(201)
                .then(res => {
                    expect(res.body.permissions).toEqual(validRoleData.permissions);
                    expect(res.body.name).toBe('Valid Role Test');
                });

            // Test 2: Role with empty name (should fail validation)
            const invalidRoleData = {
                name: '', // Invalid empty name
                description: 'Role with invalid name',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: [PERMISSIONS.CLIENT_VIEW]
            };

            return request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidRoleData)
                .expect(400)
                .then(res => {
                    const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                    expect(messages.some(msg => msg.includes('name') && (msg.includes('should not be empty') || msg.includes('is required')))).toBe(true);
                });
        });
    });
});
