import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { CreateClientDto } from '../../src/clients/dto/create-client.dto';
import { UpdateClientDto } from '../../src/clients/dto/update-client.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Clients CRUD - Business Logic & Workflow Testing (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let orchardModel: Model<any>;

    // Test users representing REAL business stakeholders
    let globalAdminToken: string; // Full client management permissions
    let subsidiaryConsultantToken: string; // Can view/edit clients in their subsidiaries
    let clientGrowerToken: string; // Can view clients they're assigned to
    let noPermissionUserToken: string; // Has no client permissions
    
    // Test entities for real business scenarios
    let testSubsidiary: SubsidiaryDocument;
    let inactiveSubsidiary: SubsidiaryDocument;
    let testClientA: ClientDocument;
    let testClientB: ClientDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        orchardModel = app.get<Model<any>>(getModelToken('Orchard'));

        // Create business hierarchy for real testing scenarios
        testSubsidiary = await new subsidiaryModel({
            recordId: 'SUB001',
            name: 'Agricultural Solutions Inc',
            isActive: true
        }).save();

        inactiveSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_INACTIVE',
            name: 'Inactive Agricultural Corp',
            isActive: false
        }).save();

        // Create realistic roles matching actual business model
        const globalAdminRole = await new roleModel({
            recordId: 'GLOBAL_ADMIN_ROLE',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions including client management
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryConsultantRole = await new roleModel({
            recordId: 'SUBSIDIARY_CONSULTANT_ROLE', 
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_EDIT,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: No CLIENT_CREATE or CLIENT_DELETE permissions
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const clientGrowerRole = await new roleModel({
            recordId: 'CLIENT_GROWER_ROLE',
            name: 'Orchard Grower/Owner',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.USER_VIEW,
                // NOTE: No client management permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const noPermissionRole = await new roleModel({
            recordId: 'NO_PERMISSION_ROLE',
            name: 'Limited Access User',
            permissions: [
                'Some:Other:Permission'
                // NOTE: No client permissions at all
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create test clients for visibility scope testing
        testClientA = await new clientModel({
            recordId: 'CLI001',
            name: 'Green Valley Orchards',
            subsidiaryId: testSubsidiary._id,
            isActive: true
        }).save();

        testClientB = await new clientModel({
            recordId: 'CLI002', 
            name: 'Sunset Fruit Farms',
            subsidiaryId: testSubsidiary._id,
            isActive: true
        }).save();

        // Create test users representing real business stakeholders
        const globalAdmin = await new userModel({
            recordId: 'GLOBAL_ADMIN_USER',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Admin',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            clientIds: [] // Global access
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUBSIDIARY_CONSULTANT_USER',
            name: 'Agricultural Consultant',
            firstName: 'Jane',
            lastName: 'Consultant',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryConsultantRole._id,
            clientIds: [testClientA._id, testClientB._id] // Works with multiple clients
        }).save();
        subsidiaryConsultantToken = jwtService.sign({ sub: subsidiaryConsultant.recordId });

        const clientGrowerUser = await new userModel({
            recordId: 'CLIENT_GROWER_USER',
            name: 'Orchard Grower',
            firstName: 'John',
            lastName: 'Appleton', 
            userType: UserType.CONTACT,
            roleId: clientGrowerRole._id,
            clientIds: [testClientA._id] // Only their own orchard
        }).save();
        clientGrowerToken = jwtService.sign({ sub: clientGrowerUser.recordId });

        const noPermissionUser = await new userModel({
            recordId: 'NO_PERMISSION_USER',
            name: 'Limited User',
            firstName: 'Limited',
            lastName: 'User',
            userType: UserType.CONTACT,
            roleId: noPermissionRole._id,
            clientIds: [testClientA._id] // Assigned but no permissions
        }).save();
        noPermissionUserToken = jwtService.sign({ sub: noPermissionUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created clients and related data, preserve setup data
        await clientModel.deleteMany({ 
            recordId: { $nin: ['CLI001', 'CLI002'] } 
        });
        await userModel.deleteMany({ 
            recordId: { $nin: [
                'GLOBAL_ADMIN_USER', 
                'SUBSIDIARY_CONSULTANT_USER',
                'CLIENT_GROWER_USER',
                'NO_PERMISSION_USER'
            ] } 
        });
        await orchardModel.deleteMany({});
        
        // Reset test clients to active state
        await clientModel.updateMany(
            { recordId: { $in: ['CLI001', 'CLI002'] } },
            { $set: { isActive: true, isDeleted: false } }
        );
    });

    // REAL BUSINESS MODEL: Client Management by Different User Types
    describe('Global Administrator Client Management (Positive Testing)', () => {
        it('should allow global administrator to create client with subsidiary relationship', async () => {
            const newClientData: CreateClientDto = {
                name: 'Premium Agricultural Services',
                subsidiaryId: testSubsidiary._id.toString()
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newClientData)
                .expect(201)
                .then(res => {
                    expect(res.body.recordId).toMatch(/^CLI\d+$/);
                    expect(res.body.name).toBe('Premium Agricultural Services');
                    expect(res.body.subsidiaryId).toBe(testSubsidiary._id.toString());
                    expect(res.body.isActive).toBe(true);
                    expect(res.body.isDeleted).toBe(false);
                });
        });

        it('should allow global administrator to create independent client (no subsidiary)', async () => {
            const independentClientData: CreateClientDto = {
                name: 'Independent Family Farm',
                subsidiaryId: null as any
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(independentClientData)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toBe('Independent Family Farm');
                    expect(res.body.subsidiaryId).toBeNull();
                    expect(res.body.recordId).toMatch(/^CLI\d+$/);
                });
        });

        it('should allow global administrator to view all clients', async () => {
            return request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(2); // At least our setup clients
                    const clientNames = res.body.map((client: any) => client.name);
                    expect(clientNames).toContain('Green Valley Orchards');
                    expect(clientNames).toContain('Sunset Fruit Farms');
                });
        });

        it('should allow global administrator to update any client', async () => {
            const updateData: UpdateClientDto = {
                name: 'Updated by Administrator'
            };

            return request(app.getHttpServer())
                .patch(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateData)
                .expect(200)
                .then(res => {
                    expect(res.body.name).toBe('Updated by Administrator');
                    expect(res.body._id).toBe(testClientA._id.toString());
                });
        });

        it('should allow global administrator to delete clients', async () => {
            // Delete should succeed
            await request(app.getHttpServer())
                .delete(`/clients/${testClientB._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });

            // Client should no longer be accessible via normal GET
            await request(app.getHttpServer())
                .get(`/clients/${testClientB._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should generate sequential recordIds for concurrent client creation', async () => {
            const clientPromises = Array.from({ length: 3 }, (_, i) => 
                request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ 
                        name: `Concurrent Client ${i + 1}`, 
                        subsidiaryId: testSubsidiary._id.toString()
                    })
                    .expect(201)
            );

            const responses = await Promise.all(clientPromises);
            const recordIds = responses.map(res => res.body.recordId);

            // Verify proper recordId format and uniqueness
            recordIds.forEach(recordId => {
                expect(recordId).toMatch(/^CLI\d+$/);
            });

            const uniqueIds = new Set(recordIds);
            expect(uniqueIds.size).toBe(3); // All should be unique
        });
    });

    describe('Security Enforcement: Permission-Based Access Control (Negative Testing)', () => {
        describe('Subsidiary Consultant - Limited Client Management Access', () => {
            it('should prevent consultant from creating new clients (403 Forbidden)', async () => {
                const unauthorizedClientData: CreateClientDto = {
                    name: 'Unauthorized Client Creation',
                    subsidiaryId: testSubsidiary._id.toString()
                };

                // Consultant lacks CLIENT_CREATE permission
                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(unauthorizedClientData)
                    .expect(403);
            });

            it('should allow consultant to view clients within their scope', async () => {
                // Consultant should see both clients they're assigned to
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(2);
                        const clientRecordIds = res.body.map((client: any) => client.recordId);
                        expect(clientRecordIds).toContain('CLI001');
                        expect(clientRecordIds).toContain('CLI002');
                    });
            });

            it('should allow consultant to edit clients within their scope', async () => {
                const updateData: UpdateClientDto = {
                    name: 'Updated by Consultant'
                };

                return request(app.getHttpServer())
                    .patch(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Updated by Consultant');
                    });
            });

            it('should prevent consultant from deleting clients (403 Forbidden)', async () => {
                // Consultant lacks CLIENT_DELETE permission
                return request(app.getHttpServer())
                    .delete(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403);
            });
        });

        describe('Client Grower - Read-Only Client Access', () => {
            it('should prevent grower from creating clients (403 Forbidden)', async () => {
                const unauthorizedClientData: CreateClientDto = {
                    name: 'Grower Attempted Client',
                    subsidiaryId: testSubsidiary._id.toString()
                };

                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(unauthorizedClientData)
                    .expect(403);
            });

            it('should allow grower to view only their assigned client', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].recordId).toBe('CLI001'); // Use recordId instead of name
                        expect(res.body[0]._id).toBe(testClientA._id.toString());
                    });
            });

            it('should prevent grower from accessing clients outside their scope', async () => {
                // Grower should not see Client B (not assigned to them)
                return request(app.getHttpServer())
                    .get(`/clients/${testClientB._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404); // Filtered out by visibility scope
            });

            it('should prevent grower from editing any clients (403 Forbidden)', async () => {
                const updateData: UpdateClientDto = {
                    name: 'Unauthorized Edit by Grower'
                };

                // Grower lacks CLIENT_EDIT permission
                return request(app.getHttpServer())
                    .patch(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(updateData)
                    .expect(403);
            });

            it('should prevent grower from deleting clients (403 Forbidden)', async () => {
                return request(app.getHttpServer())
                    .delete(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403);
            });
        });

        describe('No Permission User - Complete Access Denial', () => {
            it('should prevent user with no client permissions from creating clients (403)', async () => {
                const unauthorizedClientData: CreateClientDto = {
                    name: 'No Permission Attempt',
                    subsidiaryId: testSubsidiary._id.toString()
                };

                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .send(unauthorizedClientData)
                    .expect(403);
            });

            it('should prevent user with no client permissions from viewing clients (403)', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .expect(403); // Blocked by @RequirePermission('Client:View') guard
            });

            it('should prevent user with no client permissions from accessing specific clients (403)', async () => {
                return request(app.getHttpServer())
                    .get(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .expect(403);
            });

            it('should prevent user with no client permissions from editing clients (403)', async () => {
                const updateData: UpdateClientDto = {
                    name: 'Blocked Edit Attempt'
                };

                return request(app.getHttpServer())
                    .patch(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .send(updateData)
                    .expect(403);
            });

            it('should prevent user with no client permissions from deleting clients (403)', async () => {
                return request(app.getHttpServer())
                    .delete(`/clients/${testClientA._id}`)
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .expect(403);
            });
        });
    });

    describe('Business Rule Validation - Real Client Management Scenarios', () => {
        it('should reject client creation with non-existent subsidiaryId', async () => {
            const fakeSubsidiaryId = new Types.ObjectId().toHexString();
            const invalidClientData: CreateClientDto = {
                name: 'Client with Invalid Subsidiary',
                subsidiaryId: fakeSubsidiaryId
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidClientData)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toContain(`Subsidiary with ID "${fakeSubsidiaryId}" does not exist, is inactive, or has been deleted.`);
                });
        });

        it('should reject client creation with inactive subsidiaryId', async () => {
            const invalidClientData: CreateClientDto = {
                name: 'Client with Inactive Subsidiary',
                subsidiaryId: inactiveSubsidiary._id.toString()
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidClientData)
                .expect(400)
                .then(res => {
                    const message = Array.isArray(res.body.message) ? res.body.message[0] : res.body.message;
                    expect(message).toContain('does not exist, is inactive, or has been deleted');
                });
        });

        it('should enforce client deactivation business rules when active users exist', async () => {
            // Create an active user assigned to testClientA
            const userWithClient = await new userModel({
                recordId: 'USER_ASSIGNED_TO_CLIENT',
                name: 'User Assigned to Client',
                firstName: 'Assigned',
                lastName: 'User',
                userType: UserType.CONTACT,
                roleId: (await roleModel.findOne({ recordId: 'CLIENT_GROWER_ROLE' }))!._id,
                clientIds: [testClientA._id],
                isActive: true
            }).save();

            // Should prevent deactivation due to active user
            return request(app.getHttpServer())
                .patch(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This client cannot be deactivated because it has');
                    expect(res.body.message).toContain('active user(s) assigned to it');
                });
        });

        it('should enforce client deactivation business rules when active orchards exist', async () => {
            // Create an active orchard assigned to testClientB
            await new orchardModel({
                recordId: 'ORC001',
                name: 'Active Test Orchard',
                clientId: testClientB._id,
                isActive: true,
                isDeleted: false
            }).save();

            // Should prevent deactivation due to active orchard
            return request(app.getHttpServer())
                .patch(`/clients/${testClientB._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This client cannot be deactivated because it has 1 active orchard(s)');
                });
        });

        it('should handle client deletion with user/orchard cleanup transaction', async () => {
            // Create user and orchard associated with client
            const assignedUser = await new userModel({
                recordId: 'USER_FOR_CLIENT_DELETION',
                name: 'User for Deletion Test',
                firstName: 'Test',
                lastName: 'User',
                userType: UserType.CONTACT,
                roleId: (await roleModel.findOne({ recordId: 'CLIENT_GROWER_ROLE' }))!._id,
                clientIds: [testClientA._id]
            }).save();

            await new orchardModel({
                recordId: 'ORC_FOR_DELETION',
                name: 'Orchard for Deletion Test',
                clientId: testClientA._id,
                isActive: true
            }).save();

            // Delete the client
            await request(app.getHttpServer())
                .delete(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify user's clientIds was updated (removed this client)
            const updatedUser = await userModel.findById(assignedUser._id);
            expect(updatedUser?.clientIds).not.toContain(testClientA._id);

            // Verify orchard was soft-deleted
            const updatedOrchard = await orchardModel.findOne({ recordId: 'ORC_FOR_DELETION' });
            expect(updatedOrchard?.isDeleted).toBe(true);
            expect(updatedOrchard?.isActive).toBe(false);
        });

        it('should validate proper client data structure in creation response', async () => {
            const completeClientData: CreateClientDto = {
                name: 'Complete Test Client',
                subsidiaryId: testSubsidiary._id.toString()
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(completeClientData)
                .expect(201)
                .then(res => {
                    expect(res.body.recordId).toMatch(/^CLI\d+$/);
                    expect(res.body.name).toBe('Complete Test Client');
                    expect(res.body.subsidiaryId).toBe(testSubsidiary._id.toString());
                    expect(res.body.isActive).toBe(true);
                    expect(res.body.isDeleted).toBe(false);
                    expect(res.body).toHaveProperty('createdAt');
                    expect(res.body).toHaveProperty('updatedAt');
                });
        });

        it('should handle client soft deletion correctly', async () => {
            // Create a fresh client for this test
            const clientForDeletion = await new clientModel({
                recordId: 'CLI_FOR_DELETION_TEST',
                name: 'Client for Deletion Test',
                subsidiaryId: testSubsidiary._id,
                isActive: true,
                isDeleted: false
            }).save();

            // First deletion should succeed
            await request(app.getHttpServer())
                .delete(`/clients/${clientForDeletion._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });

            // Verify client is no longer accessible after soft deletion
            return request(app.getHttpServer())
                .get(`/clients/${clientForDeletion._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should reject client update with missing required fields', async () => {
            const invalidUpdateData = { name: '' }; // Empty name

            return request(app.getHttpServer())
                .patch(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidUpdateData)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toContain('name should not be empty');
                });
        });

        it('should return 404 for operations on non-existent clients', async () => {
            const fakeClientId = new Types.ObjectId().toHexString();

            // GET non-existent
            await request(app.getHttpServer())
                .get(`/clients/${fakeClientId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);

            // UPDATE non-existent
            await request(app.getHttpServer())
                .patch(`/clients/${fakeClientId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ name: 'Update Non-existent' })
                .expect(404);

            // DELETE non-existent
            await request(app.getHttpServer())
                .delete(`/clients/${fakeClientId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });

    describe('Query Filtering & Data Visibility Testing', () => {
        beforeEach(async () => {
            // Create additional test clients with different states
            await Promise.all([
                new clientModel({
                    recordId: 'CLI_ACTIVE_EXTRA',
                    name: 'Additional Active Client',
                    subsidiaryId: testSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_INACTIVE_TEST',
                    name: 'Inactive Test Client',
                    subsidiaryId: testSubsidiary._id,
                    isActive: false,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_DELETED_TEST',
                    name: 'Deleted Test Client',
                    subsidiaryId: testSubsidiary._id,
                    isActive: false,
                    isDeleted: true
                }).save(),
                new clientModel({
                    recordId: 'CLI_INDEPENDENT',
                    name: 'Independent Client',
                    subsidiaryId: null,
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);
        });

        it('should retrieve only active, non-deleted clients by default', async () => {
            return request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    // Should see 4 active clients: CLI001, CLI002, CLI_ACTIVE_EXTRA, CLI_INDEPENDENT
                    expect(res.body.length).toBe(4);
                    res.body.forEach(client => {
                        expect(client.isActive).toBe(true);
                        expect(client.isDeleted).toBe(false);
                    });
                });
        });

        it('should include inactive clients when includeInactives=true', async () => {
            return request(app.getHttpServer())
                .get('/clients?includeInactives=true')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    // Should see 5 clients: 4 active + 1 inactive (but not deleted)
                    expect(res.body.length).toBe(5);
                    const recordIds = res.body.map(c => c.recordId);
                    expect(recordIds).toContain('CLI_INACTIVE_TEST');
                    expect(recordIds).not.toContain('CLI_DELETED_TEST');
                });
        });

        it('should filter clients by subsidiary when subsidiaryId provided', async () => {
            return request(app.getHttpServer())
                .get(`/clients?subsidiaryId=${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    // Should see 3 clients with subsidiary: CLI001, CLI002, CLI_ACTIVE_EXTRA
                    expect(res.body.length).toBe(3);
                    res.body.forEach(client => {
                        expect(client.subsidiaryId).toBe(testSubsidiary._id.toString());
                    });
                });
        });

        it('should find independent clients (no subsidiary filtering)', async () => {
            return request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    // Find the independent client in the results
                    const independentClient = res.body.find(client => client.recordId === 'CLI_INDEPENDENT');
                    expect(independentClient).toBeDefined();
                    expect(independentClient.subsidiaryId).toBeNull();
                });
        });

        it('should search clients by name (case-insensitive)', async () => {
            // Search for part of the 'Additional Active Client' name created in beforeEach
            return request(app.getHttpServer())
                .get('/clients?name=additional')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                    // Should find the additional active client
                    const foundClient = res.body.find(client => client.recordId === 'CLI_ACTIVE_EXTRA');
                    expect(foundClient).toBeDefined();
                    expect(foundClient.name.toLowerCase()).toContain('additional');
                });
        });
    });
});