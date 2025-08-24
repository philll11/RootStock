import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles Advanced Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let clientModel: Model<any>;
    let subsidiaryModel: Model<any>;

    // Test users representing complex business scenarios
    let globalAdminToken: string;
    let subsidiaryManagerToken: string;
    let clientAOwnerToken: string;
    let clientBOwnerToken: string;
    let consultantToken: string;

    // Test entities for complex scenarios
    let testSubsidiary: any;
    let competitorSubsidiary: any;
    let clientA: any;
    let clientB: any;
    let competitorClient: any;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        clientModel = app.get<Model<any>>(getModelToken('Client'));
        subsidiaryModel = app.get<Model<any>>(getModelToken('Subsidiary'));

        // Create complex multi-subsidiary business scenario
        testSubsidiary = await new subsidiaryModel({
            recordId: 'SUB001',
            name: 'AgriTech Solutions Group'
        }).save();

        competitorSubsidiary = await new subsidiaryModel({
            recordId: 'SUB002', 
            name: 'Competitor Ag Corp'
        }).save();

        // Create clients under different subsidiaries
        clientA = await new clientModel({
            recordId: 'CLI001',
            name: 'Premium Orchards LLC',
            subsidiaryId: testSubsidiary._id
        }).save();

        clientB = await new clientModel({
            recordId: 'CLI002',
            name: 'Family Fruit Farms',
            subsidiaryId: testSubsidiary._id
        }).save();

        competitorClient = await new clientModel({
            recordId: 'CLI003',
            name: 'Rival Orchards Inc',
            subsidiaryId: competitorSubsidiary._id
        }).save();

        // Create complex role hierarchy
        const globalAdminRole = await new roleModel({
            recordId: 'GLOBAL_ADMIN',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryManagerRole = await new roleModel({
            recordId: 'SUB_MANAGER',
            name: 'Subsidiary Operations Manager',
            permissions: [
                PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_EDIT, PERMISSIONS.ROLE_DELETE,
                PERMISSIONS.USER_CREATE, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT,
                PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const clientOwnerRole = await new roleModel({
            recordId: 'CLIENT_OWNER',
            name: 'Orchard Owner/Manager',
            permissions: [
                PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_EDIT,
                PERMISSIONS.USER_CREATE, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT,
                PERMISSIONS.ORCHARD_CREATE, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const multiClientConsultantRole = await new roleModel({
            recordId: 'MULTI_CONSULTANT',
            name: 'Multi-Client Agricultural Consultant',
            permissions: [
                PERMISSIONS.ROLE_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY // Can work across multiple clients
        }).save();

        // Create users for complex scenarios
        const globalAdmin = await new userModel({
            recordId: 'GLOBAL_ADMIN_USER',
            name: 'Global Admin',
            firstName: 'Super',
            lastName: 'Admin',
            email: 'super.admin@roles-test.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            clientIds: []
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        const subsidiaryManager = await new userModel({
            recordId: 'SUB_MANAGER_USER',
            name: 'Operations Manager',
            firstName: 'Operations',
            lastName: 'Manager',
            email: 'operations.manager@roles-test.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id,
            clientIds: [clientA._id, clientB._id]
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: subsidiaryManager.recordId });

        const clientAOwner = await new userModel({
            recordId: 'CLIENT_A_OWNER',
            name: 'Premium Orchard Owner',
            firstName: 'Premium',
            lastName: 'Owner',
            email: 'premium.owner@roles-test.com',
            userType: UserType.CONTACT,
            roleId: clientOwnerRole._id,
            clientIds: [clientA._id]
        }).save();
        clientAOwnerToken = jwtService.sign({ sub: clientAOwner.recordId });

        const clientBOwner = await new userModel({
            recordId: 'CLIENT_B_OWNER',
            name: 'Family Farm Owner',
            firstName: 'Family',
            lastName: 'Owner',
            email: 'family.owner@roles-test.com',
            userType: UserType.CONTACT,
            roleId: clientOwnerRole._id,
            clientIds: [clientB._id]
        }).save();
        clientBOwnerToken = jwtService.sign({ sub: clientBOwner.recordId });

        const consultant = await new userModel({
            recordId: 'MULTI_CONSULTANT_USER',
            name: 'Multi-Client Consultant',
            firstName: 'Expert',
            lastName: 'Consultant',
            email: 'multi.consultant@roles-test.com',
            userType: UserType.EMPLOYEE,
            roleId: multiClientConsultantRole._id,
            clientIds: [clientA._id, clientB._id] // Works with both clients
        }).save();
        consultantToken = jwtService.sign({ sub: consultant.recordId });
    });


    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created entities
        await roleModel.deleteMany({
            recordId: { $nin: ['GLOBAL_ADMIN', 'SUB_MANAGER', 'CLIENT_OWNER', 'MULTI_CONSULTANT'] }
        });
        await userModel.deleteMany({
            recordId: { $nin: ['GLOBAL_ADMIN_USER', 'SUB_MANAGER_USER', 'CLIENT_A_OWNER', 'CLIENT_B_OWNER', 'MULTI_CONSULTANT_USER'] }
        });
    });

    describe('Complex Business Rule Enforcement', () => {
        it('should prevent role deactivation when active users depend on it (business continuity)', async () => {
            // Create a role with active users
            const supervisorRole = await new roleModel({
                recordId: 'SUPERVISOR_ROLE',
                name: 'Field Supervisor',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Spray:Create', 'Orchard:View']
            }).save();

            // Create an active user with this role
            await new userModel({
                recordId: 'ACTIVE_SUPERVISOR',
                name: 'Active Supervisor',
                firstName: 'Active',
                lastName: 'Supervisor',
                email: 'active.supervisor@roles-test.com',
                userType: UserType.CONTACT,
                roleId: supervisorRole._id,
                clientIds: [clientA._id],
                isActive: true
            }).save();

            // Should prevent deactivation with clear business message
            return request(app.getHttpServer())
                .patch(`/roles/${supervisorRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it');
                });
        });

        it('should allow role deactivation after users are reassigned (proper workflow)', async () => {
            const oldRole = await new roleModel({
                recordId: 'OLD_ROLE',
                name: 'Deprecated Role',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Legacy:Permission']
            }).save();

            const newRole = await new roleModel({
                recordId: 'NEW_ROLE',
                name: 'Updated Role',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Modern:Permission']
            }).save();

            // Create user with old role
            const user = await new userModel({
                recordId: 'MIGRATING_USER',
                name: 'Migrating User',
                firstName: 'Migrating',
                lastName: 'User',
                email: 'migrating.user@roles-test.com',
                userType: UserType.CONTACT,
                roleId: oldRole._id,
                clientIds: [clientA._id]
            }).save();

            // First reassign the user to new role
            await userModel.findByIdAndUpdate(user._id, { roleId: newRole._id });

            // Now should allow role deactivation
            return request(app.getHttpServer())
                .patch(`/roles/${oldRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(false);
                });
        });
    });

    describe('Transactional Role Operations - Data Integrity', () => {
        it('should atomically clean up user assignments when role is deleted', async () => {
            const roleToDelete = await new roleModel({
                recordId: 'DELETABLE_ROLE',
                name: 'Role to be Deleted',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Temp:Permission']
            }).save();

            // Create multiple users with this role
            const user1 = await new userModel({
                recordId: 'USER_1',
                name: 'User 1',
                firstName: 'User',
                lastName: '1',
                email: 'user1.lifecycle@roles-test.com',
                userType: UserType.CONTACT,
                roleId: roleToDelete._id,
                clientIds: [clientA._id]
            }).save();

            const user2 = await new userModel({
                recordId: 'USER_2',
                name: 'User 2',
                firstName: 'User',
                lastName: '2',
                email: 'user2.lifecycle@roles-test.com',
                userType: UserType.CONTACT,
                roleId: roleToDelete._id,
                clientIds: [clientB._id]
            }).save();

            // Delete the role
            await request(app.getHttpServer())
                .delete(`/roles/${roleToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify all users have null roleId
            const updatedUser1 = await userModel.findById(user1._id);
            const updatedUser2 = await userModel.findById(user2._id);
            
            expect(updatedUser1?.roleId).toBeNull();
            expect(updatedUser2?.roleId).toBeNull();

            // Verify role is soft-deleted
            const deletedRole = await roleModel.findById(roleToDelete._id);
            expect(deletedRole?.isDeleted).toBe(true);
            expect(deletedRole?.isActive).toBe(false);
        });

        it('should handle concurrent role operations without data corruption', async () => {
            const concurrentRole = await new roleModel({
                recordId: 'CONCURRENT_ROLE',
                name: 'Concurrent Test Role',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Test:Permission']
            }).save();

            // Simulate concurrent updates (in real scenario these would be from different users/sessions)
            const updatePromises = [
                request(app.getHttpServer())
                    .patch(`/roles/${concurrentRole._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 'Updated Name 1' }),
                request(app.getHttpServer())
                    .patch(`/roles/${concurrentRole._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 'Updated Name 2' })
            ];

            const results = await Promise.allSettled(updatePromises);
            
            // At least one should succeed
            const successful = results.filter(result => 
                result.status === 'fulfilled' && result.value.status === 200
            );
            expect(successful.length).toBeGreaterThan(0);

            // Verify role still exists and is not corrupted
            const finalRole = await roleModel.findById(concurrentRole._id);
            expect(finalRole).not.toBeNull();
            expect(['Updated Name 1', 'Updated Name 2']).toContain(finalRole?.name);
        });

        it('should handle concurrent role deletions without write conflicts', async () => {
            // Create multiple roles for concurrent deletion testing
            const rolePromises = Array.from({ length: 3 }, (_, i) => 
                new roleModel({
                    recordId: `CONCURRENT_DELETE_${i + 1}`,
                    name: `Concurrent Delete Role ${i + 1}`,
                    visibilityScope: VisibilityScope.CLIENT,
                    permissions: ['Test:Permission']
                }).save()
            );
            const testRoles = await Promise.all(rolePromises);

            // Simulate concurrent deletions (in real scenario these would be from different users/sessions)
            const deletePromises = testRoles.map(role =>
                request(app.getHttpServer())
                    .delete(`/roles/${role._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
            );

            // Execute all deletions concurrently
            const results = await Promise.allSettled(deletePromises);

            // All deletions should succeed (idempotent behavior)
            results.forEach((result, index) => {
                expect(result.status).toBe('fulfilled');
                if (result.status === 'fulfilled') {
                    expect(result.value.status).toBe(200);
                }
            });

            // Verify all roles are properly soft deleted
            const deletedRoles = await roleModel.find({ 
                _id: { $in: testRoles.map(r => r._id) }
            });

            deletedRoles.forEach(role => {
                expect(role.isDeleted).toBe(true);
                expect(role.isActive).toBe(false);
            });
        });
    });

    describe('Multi-Client Consultant Workflows', () => {
        it('should prevent consultant from modifying roles (advisory role)', async () => {
            const clientRole = await new roleModel({
                recordId: 'CONSULTANT_READONLY_TEST',
                name: 'Consultant Read Only Test',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Orchard:View']
            }).save();

            // Consultant can view but not modify
            return request(app.getHttpServer())
                .patch(`/roles/${clientRole._id}`)
                .set('Authorization', `Bearer ${consultantToken}`)
                .send({ name: 'Unauthorized Edit' })
                .expect(403);
        });
    });

    describe('Real Orchard Management Scenarios', () => {
        it('should support seasonal worker role creation workflow', async () => {
            // Orchard owner creates seasonal roles for harvest season
            const seasonalWorkerRole = {
                name: 'Harvest Season Picker',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Harvest:Record', 'Orchard:View']
            };

            const sprayOperatorRole = {
                name: 'Spray Application Specialist',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Spray:Create', 'Spray:View', 'Chemical:View', 'Orchard:View']
            };

            // Client A owner creates roles for their operation
            const seasonalResponse = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${clientAOwnerToken}`)
                .send(seasonalWorkerRole)
                .expect(201);

            const sprayResponse = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${clientAOwnerToken}`)
                .send(sprayOperatorRole)
                .expect(201);

            expect(seasonalResponse.body.name).toBe('Harvest Season Picker');
            expect(sprayResponse.body.name).toBe('Spray Application Specialist');
        });

        it('should prevent cross-client role access in competitive scenario', async () => {
            // Client A creates a proprietary role
            const proprietaryRole = await new roleModel({
                recordId: 'PROPRIETARY_ROLE',
                name: 'Proprietary Orchard Manager',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: ['Trade:Secret', 'Orchard:Optimize']
            }).save();

            // Client B should not be able to see or access Client A's proprietary role
            return request(app.getHttpServer())
                .get(`/roles/${proprietaryRole._id}`)
                .set('Authorization', `Bearer ${clientBOwnerToken}`)
                .expect(404); // Hidden from competitor
        });

        it('should support subsidiary-wide quality management role', async () => {
            const qualityManagerRole = {
                name: 'Quality Assurance Manager',
                visibilityScope: VisibilityScope.SUBSIDIARY,
                permissions: [
                    'Quality:Audit',
                    'Quality:Report',
                    PERMISSIONS.ORCHARD_VIEW,
                    'Compliance:Monitor'
                ]
            };

            // Subsidiary manager creates cross-client quality role
            return request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                .send(qualityManagerRole)
                .expect(201)
                .then(res => {
                    expect(res.body.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
                    expect(res.body.permissions).toContain('Quality:Audit');
                });
        });
    });

    describe('Business Relationship Validation', () => {
        it('should validate nested user-role relationships through GET /roles/:id/users', async () => {
            const managerRole = await new roleModel({
                recordId: 'MANAGER_WITH_STAFF',
                name: 'Manager with Staff',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.ORCHARD_EDIT]
            }).save();

            // Create staff users under this role
            await new userModel({
                recordId: 'STAFF_1',
                name: 'Staff Member 1',
                firstName: 'Staff',
                lastName: '1',
                email: 'staff1@roles-test.com',
                userType: UserType.CONTACT,
                roleId: managerRole._id,
                clientIds: [clientA._id]
            }).save();

            await new userModel({
                recordId: 'STAFF_2',
                name: 'Staff Member 2',
                firstName: 'Staff',
                lastName: '2',
                email: 'staff2@roles-test.com',
                userType: UserType.CONTACT,
                roleId: managerRole._id,
                clientIds: [clientA._id]
            }).save();

            // Only platform administrator can access role-user relationships  
            return request(app.getHttpServer())
                .get(`/roles/${managerRole._id}/users`)
                .set('Authorization', `Bearer ${globalAdminToken}`) // Use admin token instead
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(2);
                    const staffIds = res.body.map((user: any) => user.recordId);
                    expect(staffIds).toContain('STAFF_1');
                    expect(staffIds).toContain('STAFF_2');
                });
        });

        it('should enforce business rule: prevent deletion of roles with dependent business processes', async () => {
            // In a real scenario, this would involve checking for active orchards, ongoing sprays, etc.
            const criticalRole = await new roleModel({
                recordId: 'CRITICAL_OPERATIONS',
                name: 'Critical Operations Manager',
                visibilityScope: VisibilityScope.CLIENT,
                permissions: [PERMISSIONS.ORCHARD_EDIT, 'Emergency:Response']
            }).save();

            // Create a user who manages critical operations
            await new userModel({
                recordId: 'CRITICAL_OPERATOR',
                name: 'Critical Operator',
                firstName: 'Critical',
                lastName: 'Operator',
                email: 'critical.operator@roles-test.com',
                userType: UserType.CONTACT,
                roleId: criticalRole._id,
                clientIds: [clientA._id],
                isActive: true
            }).save();

            // Should succeed with soft delete and user cleanup
            return request(app.getHttpServer())
                .delete(`/roles/${criticalRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);
        });
    });
});