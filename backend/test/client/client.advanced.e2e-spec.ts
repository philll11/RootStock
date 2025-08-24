import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Clients Advanced Business Logic - Complex Multi-Tenant Scenarios (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let orchardModel: Model<any>;

    // Test users for complex business scenarios
    let globalAdminToken: string;
    let subsidiaryManagerToken: string;
    let multiClientConsultantToken: string;
    let clientOwnerToken: string;
    let fieldSupervisorToken: string;
    
    // Test entities for complex multi-subsidiary operations
    let agriculturalSolutionsSubsidiary: SubsidiaryDocument;
    let competitorSubsidiary: SubsidiaryDocument;
    let premiumClient: ClientDocument; // Large operation with multiple users
    let familyFarmClient: ClientDocument; // Small family operation
    let competitorClient: ClientDocument; // Client in different subsidiary
    let independentClient: ClientDocument; // No subsidiary affiliation

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        orchardModel = app.get<Model<any>>(getModelToken('Orchard'));

        // Create complex multi-subsidiary business scenario
        agriculturalSolutionsSubsidiary = await new subsidiaryModel({
            recordId: 'AGRI_SOLUTIONS_ADV',
            name: 'Agricultural Solutions Advanced',
            isActive: true
        }).save();

        competitorSubsidiary = await new subsidiaryModel({
            recordId: 'COMPETITOR_SUB_ADV',
            name: 'Competitor Agricultural Services',
            isActive: true
        }).save();

        // Create diverse client portfolio for testing
        premiumClient = await new clientModel({
            recordId: 'PREMIUM_CLIENT_ADV',
            name: 'Premium Orchards Corporation',
            subsidiaryId: agriculturalSolutionsSubsidiary._id,
            isActive: true
        }).save();

        familyFarmClient = await new clientModel({
            recordId: 'FAMILY_FARM_ADV',
            name: 'Johnson Family Farm',
            subsidiaryId: agriculturalSolutionsSubsidiary._id,
            isActive: true
        }).save();

        competitorClient = await new clientModel({
            recordId: 'COMPETITOR_CLIENT_ADV',
            name: 'Competitor Orchard Network',
            subsidiaryId: competitorSubsidiary._id,
            isActive: true
        }).save();

        independentClient = await new clientModel({
            recordId: 'INDEPENDENT_FARM_ADV',
            name: 'Independent Organic Farm',
            subsidiaryId: null,
            isActive: true
        }).save();

        // Create complex roles with different permission levels
        const globalAdminRole = await new roleModel({
            recordId: 'GLOBAL_ADMIN_ADV',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryManagerRole = await new roleModel({
            recordId: 'SUB_MANAGER_ADV',
            name: 'Subsidiary Manager',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_EDIT,
                PERMISSIONS.CLIENT_CREATE,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.SUBSIDIARY_VIEW
                // No CLIENT_DELETE permission - business rule
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const multiClientConsultantRole = await new roleModel({
            recordId: 'MULTI_CLIENT_CONSULTANT_ADV',
            name: 'Multi-Client Agricultural Consultant',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_EDIT,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const clientOwnerRole = await new roleModel({
            recordId: 'CLIENT_OWNER_ADV',
            name: 'Orchard Owner/Manager',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT
                // No client editing permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const fieldSupervisorRole = await new roleModel({
            recordId: 'FIELD_SUPERVISOR_ADV',
            name: 'Field Operations Supervisor',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT
                // No CLIENT_VIEW permission
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create users representing complex business relationships
        const globalAdmin = await new userModel({
            recordId: 'GLOBAL_ADMIN_USER_ADV',
            name: 'Platform Administrator',
            firstName: 'System',
            lastName: 'Admin',
            email: 'platform.admin@example.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            clientIds: []
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        const subsidiaryManager = await new userModel({
            recordId: 'SUB_MANAGER_USER_ADV',
            name: 'Regional Operations Manager',
            firstName: 'Regional',
            lastName: 'Manager',
            email: 'regional.manager@example.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id,
            clientIds: [premiumClient._id, familyFarmClient._id]
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: subsidiaryManager.recordId });

        const multiClientConsultant = await new userModel({
            recordId: 'MULTI_CONSULTANT_USER_ADV',
            name: 'Senior Agricultural Consultant',
            firstName: 'Expert',
            lastName: 'Consultant',
            email: 'expert.consultant@example.com',
            userType: UserType.EMPLOYEE,
            roleId: multiClientConsultantRole._id,
            clientIds: [premiumClient._id, familyFarmClient._id]
        }).save();
        multiClientConsultantToken = jwtService.sign({ sub: multiClientConsultant.recordId });

        const clientOwner = await new userModel({
            recordId: 'CLIENT_OWNER_USER_ADV',
            name: 'Premium Orchards CEO',
            firstName: 'Business',
            lastName: 'Owner',
            email: 'business.owner@example.com',
            userType: UserType.CONTACT,
            roleId: clientOwnerRole._id,
            clientIds: [premiumClient._id]
        }).save();
        clientOwnerToken = jwtService.sign({ sub: clientOwner.recordId });

        const fieldSupervisor = await new userModel({
            recordId: 'FIELD_SUPERVISOR_USER_ADV',
            name: 'Field Operations Lead',
            firstName: 'Field',
            lastName: 'Supervisor',
            email: 'field.supervisor@example.com',
            userType: UserType.CONTACT,
            roleId: fieldSupervisorRole._id,
            clientIds: [premiumClient._id]
        }).save();
        fieldSupervisorToken = jwtService.sign({ sub: fieldSupervisor.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created entities, preserve setup data
        await clientModel.deleteMany({
            recordId: { $nin: ['PREMIUM_CLIENT_ADV', 'FAMILY_FARM_ADV', 'COMPETITOR_CLIENT_ADV', 'INDEPENDENT_FARM_ADV'] }
        });
        await userModel.deleteMany({
            recordId: { $nin: [
                'GLOBAL_ADMIN_USER_ADV',
                'SUB_MANAGER_USER_ADV',
                'MULTI_CONSULTANT_USER_ADV',
                'CLIENT_OWNER_USER_ADV',
                'FIELD_SUPERVISOR_USER_ADV'
            ] }
        });
        await orchardModel.deleteMany({});

        // Reset test clients to active state and ensure they're not deleted
        await clientModel.updateMany(
            { recordId: { $in: ['PREMIUM_CLIENT_ADV', 'FAMILY_FARM_ADV', 'COMPETITOR_CLIENT_ADV', 'INDEPENDENT_FARM_ADV'] } },
            { $set: { isActive: true, isDeleted: false } }
        );
    });

    describe('Complex Business Rule Enforcement - Multi-Entity Dependencies', () => {
        it('should prevent client deactivation when active users depend on it (business continuity protection)', async () => {
            // Use a separate client for this test to avoid interfering with other tests
            const testClient = await new clientModel({
                recordId: 'USER_TEST_CLIENT',
                name: 'User Dependency Test Client',
                subsidiaryId: agriculturalSolutionsSubsidiary._id,
                isActive: true
            }).save();

            // Create multiple users assigned to test client representing real business scenario
            await Promise.all([
                new userModel({
                    recordId: 'PREMIUM_MANAGER',
                    name: 'Premium Operations Manager',
                    firstName: 'Operations',
                    lastName: 'Manager',
                    email: 'operations.manager@example.com',
                    userType: UserType.CONTACT,
                    roleId: (await roleModel.findOne({ recordId: 'CLIENT_OWNER_ADV' }))!._id,
                    clientIds: [testClient._id],
                    isActive: true
                }).save(),
                new userModel({
                    recordId: 'PREMIUM_SUPERVISOR',
                    name: 'Premium Field Supervisor',
                    firstName: 'Field',
                    lastName: 'Supervisor2',
                    email: 'field.supervisor2@example.com',
                    userType: UserType.CONTACT,
                    roleId: (await roleModel.findOne({ recordId: 'FIELD_SUPERVISOR_ADV' }))!._id,
                    clientIds: [testClient._id],
                    isActive: true
                }).save()
            ]);

            // Should prevent deactivation due to active users
            return request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .expect((res) => {
                    expect(res.body.message).toContain('This client cannot be deactivated because it has');
                    expect(res.body.message).toContain('active user(s) assigned to it');
                });
        });

        it('should prevent client deactivation when active orchards exist (operational continuity)', async () => {
            // Use a fresh client for this test to avoid user conflicts
            const testClient = await new clientModel({
                recordId: 'ORCHARD_TEST_CLIENT',
                name: 'Orchard Test Client',
                subsidiaryId: agriculturalSolutionsSubsidiary._id,
                isActive: true
            }).save();

            // Create active orchards for test client
            await Promise.all([
                new orchardModel({
                    recordId: 'TEST_ORCHARD_1',
                    name: 'Test Apple Orchard North',
                    clientId: testClient._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new orchardModel({
                    recordId: 'TEST_ORCHARD_2',
                    name: 'Test Apple Orchard South',
                    clientId: testClient._id,
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);

            // Should prevent deactivation due to active orchards
            return request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .expect((res) => {
                    expect(res.body.message).toContain('This client cannot be deactivated');
                    expect(res.body.message).toContain('active orchard');
                });
        });

        it('should allow client deactivation after dependent entities are properly handled', async () => {
            // Create user and orchard for testing proper cleanup sequence
            const testUser = await new userModel({
                recordId: 'TEST_DEACTIVATION_USER',
                name: 'Test User for Deactivation',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@example.com',
                userType: UserType.CONTACT,
                roleId: (await roleModel.findOne({ recordId: 'CLIENT_OWNER_ADV' }))!._id,
                clientIds: [independentClient._id],
                isActive: true
            }).save();

            const testOrchard = await new orchardModel({
                recordId: 'TEST_DEACTIVATION_ORCHARD',
                name: 'Test Orchard for Deactivation',
                clientId: independentClient._id,
                isActive: true,
                isDeleted: false
            }).save();

            // First, deactivate the user
            await userModel.updateOne(
                { _id: testUser._id },
                { $set: { isActive: false } }
            );

            // Then, deactivate the orchard
            await orchardModel.updateOne(
                { _id: testOrchard._id },
                { $set: { isActive: false } }
            );

            // Now client deactivation should succeed
            return request(app.getHttpServer())
                .patch(`/clients/${independentClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(200)
                .expect((res) => {
                    expect(res.body.isActive).toBe(false);
                });
        });
    });

    describe('Transactional Multi-Entity Operations - Data Integrity', () => {
        it('should atomically handle client deletion with complex user/orchard cleanup', async () => {
            // Use a separate client for deletion testing to avoid affecting other tests
            const deletionTestClient = await new clientModel({
                recordId: 'DELETION_TEST_CLIENT',
                name: 'Client for Deletion Testing',
                subsidiaryId: agriculturalSolutionsSubsidiary._id,
                isActive: true
            }).save();

            // Create complex scenario with multiple users and orchards
            const users = await Promise.all([
                new userModel({
                    recordId: 'DELETION_USER_1',
                    name: 'First User for Deletion',
                    firstName: 'First',
                    lastName: 'User',
                    email: 'first.user@example.com',
                    userType: UserType.CONTACT,
                    roleId: (await roleModel.findOne({ recordId: 'CLIENT_OWNER_ADV' }))!._id,
                    clientIds: [deletionTestClient._id, familyFarmClient._id] // Assigned to multiple clients
                }).save(),
                new userModel({
                    recordId: 'DELETION_USER_2',
                    name: 'Second User for Deletion',
                    firstName: 'Second',
                    lastName: 'User',
                    email: 'second.user@example.com',
                    userType: UserType.EMPLOYEE,
                    roleId: (await roleModel.findOne({ recordId: 'MULTI_CLIENT_CONSULTANT_ADV' }))!._id,
                    clientIds: [deletionTestClient._id] // Only assigned to deletion test client
                }).save()
            ]);

            const orchards = await Promise.all([
                new orchardModel({
                    recordId: 'DELETION_ORCHARD_1',
                    name: 'Orchard for Deletion Test 1',
                    clientId: deletionTestClient._id,
                    isActive: true
                }).save(),
                new orchardModel({
                    recordId: 'DELETION_ORCHARD_2',
                    name: 'Orchard for Deletion Test 2',
                    clientId: deletionTestClient._id,
                    isActive: true
                }).save()
            ]);

            // Delete the deletion test client
            await request(app.getHttpServer())
                .delete(`/clients/${deletionTestClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });

            // Verify transactional integrity - users should be updated properly
            const updatedUsers = await userModel.find({
                _id: { $in: users.map(u => u._id) }
            });

            // User 1 should still have family farm client, deletion test client removed
            const user1 = updatedUsers.find(u => u.recordId === 'DELETION_USER_1');
            expect(user1?.clientIds).toHaveLength(1);
            expect(user1?.clientIds.map(id => id.toString())).toContain(familyFarmClient._id.toString());
            expect(user1?.clientIds.map(id => id.toString())).not.toContain(deletionTestClient._id.toString());

            // User 2 should have empty clientIds array
            const user2 = updatedUsers.find(u => u.recordId === 'DELETION_USER_2');
            expect(user2?.clientIds).toHaveLength(0);

            // Verify orchards are soft-deleted
            const updatedOrchards = await orchardModel.find({
                _id: { $in: orchards.map(o => o._id) }
            });

            updatedOrchards.forEach(orchard => {
                expect(orchard.isDeleted).toBe(true);
                expect(orchard.isActive).toBe(false);
            });
        });

        it('should handle concurrent client operations without data corruption', async () => {
            // Create multiple clients for concurrent operation testing
            const concurrentClients = await Promise.all([
                new clientModel({
                    recordId: 'CONCURRENT_CLIENT_1',
                    name: 'Concurrent Operations Client 1',
                    subsidiaryId: agriculturalSolutionsSubsidiary._id,
                    isActive: true
                }).save(),
                new clientModel({
                    recordId: 'CONCURRENT_CLIENT_2',
                    name: 'Concurrent Operations Client 2',
                    subsidiaryId: agriculturalSolutionsSubsidiary._id,
                    isActive: true
                }).save(),
                new clientModel({
                    recordId: 'CONCURRENT_CLIENT_3',
                    name: 'Concurrent Operations Client 3',
                    subsidiaryId: agriculturalSolutionsSubsidiary._id,
                    isActive: true
                }).save()
            ]);

            // Simulate concurrent operations (updates + deletions)
            const operations = [
                // Concurrent updates
                request(app.getHttpServer())
                    .patch(`/clients/${concurrentClients[0]._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 'Updated by Operation 1' }),
                request(app.getHttpServer())
                    .patch(`/clients/${concurrentClients[1]._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 'Updated by Operation 2' }),
                // Concurrent deletion
                request(app.getHttpServer())
                    .delete(`/clients/${concurrentClients[2]._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
            ];

            // Execute all operations concurrently
            const results = await Promise.allSettled(operations);

            // All operations should succeed
            results.forEach((result, index) => {
                expect(result.status).toBe('fulfilled');
                if (result.status === 'fulfilled') {
                    expect([200, 201]).toContain(result.value.status);
                }
            });

            // Verify final state integrity
            const finalStates = await clientModel.find({
                _id: { $in: concurrentClients.map(c => c._id) }
            });

            expect(finalStates[0].name).toBe('Updated by Operation 1');
            expect(finalStates[1].name).toBe('Updated by Operation 2');
            expect(finalStates[2].isDeleted).toBe(true);
            expect(finalStates[2].isActive).toBe(false);
        });

        it('should handle concurrent deletion attempts on same client gracefully', async () => {
            // Create a client specifically for concurrent deletion testing
            const clientForConcurrentDeletion = await new clientModel({
                recordId: 'CONCURRENT_DELETE_TARGET',
                name: 'Client for Concurrent Deletion Test',
                subsidiaryId: agriculturalSolutionsSubsidiary._id,
                isActive: true
            }).save();

            // Attempt concurrent deletions of the SAME client (race condition test)
            const deletion1 = request(app.getHttpServer())
                .delete(`/clients/${clientForConcurrentDeletion._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`);

            const deletion2 = request(app.getHttpServer())
                .delete(`/clients/${clientForConcurrentDeletion._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`);

            const deletion3 = request(app.getHttpServer())
                .delete(`/clients/${clientForConcurrentDeletion._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`);

            // Execute all deletions concurrently on the same client
            const [result1, result2, result3] = await Promise.allSettled([deletion1, deletion2, deletion3]);

            // All requests should complete without throwing errors
            const fulfilledResults = [result1, result2, result3].filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
            expect(fulfilledResults).toHaveLength(3); // All requests should complete

            // At least one should be successful (200), others might be 404 or 200 (idempotent behavior)
            const successCount = fulfilledResults.filter(r => r.value.status === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);

            // Verify final state - client should be soft deleted
            const finalClient = await clientModel.findById(clientForConcurrentDeletion._id);
            expect(finalClient?.isDeleted).toBe(true);
            expect(finalClient?.isActive).toBe(false);
        });
    });

    describe('Advanced Security Scenarios - Cross-Subsidiary Operations', () => {
        it('should prevent subsidiary manager from accessing clients in different subsidiary', async () => {
            // Subsidiary manager should only see clients in their subsidiary
            return request(app.getHttpServer())
                .get(`/clients/${competitorClient._id}`)
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                .expect(404); // Should not find client in different subsidiary
        });

        it('should allow global admin to access clients across all subsidiaries', async () => {
            // Global admin can see clients in any subsidiary
            return request(app.getHttpServer())
                .get(`/clients/${competitorClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.recordId).toBe('COMPETITOR_CLIENT_ADV');
                    expect(res.body.name).toBe('Competitor Orchard Network');
                });
        });

        it('should prevent multi-client consultant from creating clients (insufficient permissions)', async () => {
            const newClientData = {
                name: 'Unauthorized New Client',
                subsidiaryId: agriculturalSolutionsSubsidiary._id
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${multiClientConsultantToken}`)
                .send(newClientData)
                .expect(403); // No CLIENT_CREATE permission
        });
    });

    describe('Field-Level Access Control - Role-Based Restrictions', () => {
        it('should prevent field supervisor from viewing client information (lacks CLIENT_VIEW)', async () => {
            // Field supervisors work with orchards but shouldn't access client business data
            return request(app.getHttpServer())
                .get(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                .expect(403); // No CLIENT_VIEW permission
        });

        it('should allow client owner to view their own client information', async () => {
            return request(app.getHttpServer())
                .get(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.recordId).toBe('PREMIUM_CLIENT_ADV');
                    expect(res.body.name).toBe('Premium Orchards Corporation');
                });
        });

        it('should prevent client owner from modifying client information (lacks CLIENT_EDIT)', async () => {
            return request(app.getHttpServer())
                .patch(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .send({ name: 'Attempted Name Change' })
                .expect(403); // No CLIENT_EDIT permission
        });
    });

    describe('Advanced Query and Filter Operations', () => {
        it('should properly filter clients by subsidiary for subsidiary-scoped users', async () => {
            return request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                .expect(200)
                .expect((res) => {
                    // Should only see clients from agricultural solutions subsidiary
                    const subsidiaryClients = res.body.filter(c => 
                        ['PREMIUM_CLIENT_ADV', 'FAMILY_FARM_ADV'].includes(c.recordId)
                    );
                    expect(subsidiaryClients).toHaveLength(2);
                    
                    // Should NOT see competitor subsidiary clients
                    const competitorClients = res.body.filter(c => 
                        c.recordId === 'COMPETITOR_CLIENT_ADV'
                    );
                    expect(competitorClients).toHaveLength(0);
                });
        });

        it('should return different result sets based on user scope and permissions', async () => {
            // Global admin sees all clients
            const globalAdminResponse = await request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Client owner sees only their client
            const clientOwnerResponse = await request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200);

            // Global admin should see more clients than client owner
            expect(globalAdminResponse.body.length).toBeGreaterThan(clientOwnerResponse.body.length);
            
            // Client owner should only see premium client
            expect(clientOwnerResponse.body).toHaveLength(1);
            expect(clientOwnerResponse.body[0].recordId).toBe('PREMIUM_CLIENT_ADV');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle requests for non-existent clients appropriately', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            
            return request(app.getHttpServer())
                .get(`/clients/${nonExistentId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should handle malformed client IDs gracefully', async () => {
            return request(app.getHttpServer())
                .get('/clients/invalid-id-format')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(400);
        });

        it('should validate required fields for client creation', async () => {
            const incompleteClientData = {
                // Missing required 'name' field
                subsidiaryId: agriculturalSolutionsSubsidiary._id
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(incompleteClientData)
                .expect(400)
                .expect((res) => {
                    // Response should contain validation errors about the name field
                    const errorMessage = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
                    expect(errorMessage).toContain('name');
                });
        });
    });

    describe('Data Integrity and Business Logic', () => {
        it('should maintain referential integrity when updating subsidiary relationships', async () => {
            // Create new subsidiary for testing
            const newSubsidiary = await new subsidiaryModel({
                recordId: 'NEW_SUBSIDIARY_ADV',
                name: 'New Agricultural Subsidiary',
                isActive: true
            }).save();

            // Update family farm to new subsidiary
            const updateResponse = await request(app.getHttpServer())
                .patch(`/clients/${familyFarmClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ subsidiaryId: newSubsidiary._id })
                .expect(200);

            expect(updateResponse.body.subsidiaryId).toBe(newSubsidiary._id.toString());

            // Verify database reflects the change
            const updatedClient = await clientModel.findById(familyFarmClient._id);
            expect(updatedClient?.subsidiaryId?.toString()).toBe(newSubsidiary._id.toString());
        });

        it('should maintain proper audit trail for client modifications', async () => {
            const originalName = premiumClient.name;
            const newName = 'Premium Orchards Corporation - Updated';

            await request(app.getHttpServer())
                .patch(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ name: newName })
                .expect(200);

            // Verify the change is persisted
            const updatedClient = await clientModel.findById(premiumClient._id);
            expect(updatedClient?.name).toBe(newName);
            expect(updatedClient?.name).not.toBe(originalName);
        });
    });
});