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

describe('Clients Authorization - Real Multi-Tenant Security Model (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test users representing ACTUAL business roles with different client access levels
    let platformAdminToken: string; // Full client management permissions (global scope)
    let subsidiaryConsultantToken: string; // Can view/edit clients in their subsidiaries only
    let clientGrowerToken: string; // Can only view their assigned client
    let fieldWorkerToken: string; // Minimal permissions, no client management access
    let unauthorizedUserToken: string; // No client permissions at all

    // Test entities for multi-tenant scenarios
    let testSubsidiaryA: SubsidiaryDocument;
    let testSubsidiaryB: SubsidiaryDocument;
    let clientAinSubA: ClientDocument; // Client A in Subsidiary A
    let clientBinSubA: ClientDocument; // Client B in Subsidiary A  
    let clientCinSubB: ClientDocument; // Client C in Subsidiary B
    let independentClient: ClientDocument; // Client with no subsidiary

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create business hierarchy for authorization testing
        testSubsidiaryA = await new subsidiaryModel({
            recordId: 'SUB_AUTH_A',
            name: 'AgriTech Solutions North',
            isActive: true
        }).save();

        testSubsidiaryB = await new subsidiaryModel({
            recordId: 'SUB_AUTH_B',
            name: 'AgriTech Solutions South',
            isActive: true
        }).save();

        // Create clients in different subsidiaries for scope testing
        clientAinSubA = await new clientModel({
            recordId: 'CLI_AUTH_A_SUB_A',
            name: 'Northern Orchards Ltd',
            subsidiaryId: testSubsidiaryA._id,
            isActive: true
        }).save();

        clientBinSubA = await new clientModel({
            recordId: 'CLI_AUTH_B_SUB_A',
            name: 'Valley Farms Inc',
            subsidiaryId: testSubsidiaryA._id,
            isActive: true
        }).save();

        clientCinSubB = await new clientModel({
            recordId: 'CLI_AUTH_C_SUB_B',
            name: 'Southern Growers Co',
            subsidiaryId: testSubsidiaryB._id,
            isActive: true
        }).save();

        independentClient = await new clientModel({
            recordId: 'CLI_AUTH_INDEPENDENT',
            name: 'Independent Family Farm',
            subsidiaryId: null, // No subsidiary
            isActive: true
        }).save();

        // Create roles matching REAL system design with different permission levels
        const platformAdminRole = await new roleModel({
            recordId: 'PLATFORM_ADMIN_AUTH',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // ALL permissions including client management
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryConsultantRole = await new roleModel({
            recordId: 'SUBSIDIARY_CONSULTANT_AUTH',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_EDIT,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW
                // CRITICAL: NO CLIENT_CREATE or CLIENT_DELETE permissions
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const clientGrowerRole = await new roleModel({
            recordId: 'CLIENT_GROWER_AUTH',
            name: 'Orchard Grower',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.USER_VIEW
                // CRITICAL: NO client management permissions (no edit/create/delete)
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const fieldWorkerRole = await new roleModel({
            recordId: 'FIELD_WORKER_AUTH',
            name: 'Field Worker',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW
                // CRITICAL: NO CLIENT_VIEW permission at all
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const unauthorizedRole = await new roleModel({
            recordId: 'UNAUTHORIZED_ROLE_AUTH',
            name: 'Unauthorized User',
            permissions: [
                'Some:Other:Permission'
                // CRITICAL: NO client permissions whatsoever
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create test users representing real business stakeholders
        const platformAdmin = await new userModel({
            recordId: 'PLATFORM_ADMIN_USER_AUTH',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Admin',
            email: 'platform.admin@example.com',
            userType: UserType.EMPLOYEE,
            roleId: platformAdminRole._id,
            clientIds: [] // Global access
        }).save();
        platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUBSIDIARY_CONSULTANT_USER_AUTH',
            name: 'Agricultural Consultant',
            firstName: 'Jane',
            lastName: 'Consultant',
            email: 'jane.consultant@example.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryConsultantRole._id,
            clientIds: [clientAinSubA._id, clientBinSubA._id] // Works with clients in Subsidiary A only
        }).save();
        subsidiaryConsultantToken = jwtService.sign({ sub: subsidiaryConsultant.recordId });

        const clientGrower = await new userModel({
            recordId: 'CLIENT_GROWER_USER_AUTH',
            name: 'Orchard Grower',
            firstName: 'John',
            lastName: 'Appleton',
            email: 'john.appleton@example.com',
            userType: UserType.CONTACT,
            roleId: clientGrowerRole._id,
            clientIds: [clientAinSubA._id] // Only their specific client
        }).save();
        clientGrowerToken = jwtService.sign({ sub: clientGrower.recordId });

        const fieldWorker = await new userModel({
            recordId: 'FIELD_WORKER_USER_AUTH',
            name: 'Field Worker',
            firstName: 'Mike',
            lastName: 'Worker',
            email: 'mike.worker@example.com',
            userType: UserType.CONTACT,
            roleId: fieldWorkerRole._id,
            clientIds: [clientAinSubA._id] // Assigned to client but no CLIENT_VIEW permission
        }).save();
        fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });

        const unauthorizedUser = await new userModel({
            recordId: 'UNAUTHORIZED_USER_AUTH',
            name: 'Unauthorized User',
            firstName: 'No',
            lastName: 'Access',
            email: 'unauthorized.user@example.com',
            userType: UserType.CONTACT,
            roleId: unauthorizedRole._id,
            clientIds: [clientAinSubA._id] // Assigned but no permissions
        }).save();
        unauthorizedUserToken = jwtService.sign({ sub: unauthorizedUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created clients and users, preserve setup data  
        await clientModel.deleteMany({
            recordId: { $nin: ['CLI_AUTH_A_SUB_A', 'CLI_AUTH_B_SUB_A', 'CLI_AUTH_C_SUB_B', 'CLI_AUTH_INDEPENDENT'] }
        });
        await userModel.deleteMany({
            recordId: {
                $nin: [
                    'PLATFORM_ADMIN_USER_AUTH',
                    'SUBSIDIARY_CONSULTANT_USER_AUTH',
                    'CLIENT_GROWER_USER_AUTH',
                    'FIELD_WORKER_USER_AUTH',
                    'UNAUTHORIZED_USER_AUTH'
                ]
            }
        });

        // Reset test clients to active state
        await clientModel.updateMany(
            { recordId: { $in: ['CLI_AUTH_A_SUB_A', 'CLI_AUTH_B_SUB_A', 'CLI_AUTH_C_SUB_B', 'CLI_AUTH_INDEPENDENT'] } },
            { $set: { isActive: true, isDeleted: false } }
        );
    });

    describe('Real System Behavior - Client Access Control by Business Role (e2e)', () => {
        describe('GET /clients - Multi-Tenant Data Visibility', () => {
            it('should allow platform administrator to see ALL clients across all subsidiaries', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.length).toBeGreaterThanOrEqual(4);
                        const recordIds = res.body.map(client => client.recordId);
                        expect(recordIds).toContain('CLI_AUTH_A_SUB_A');
                        expect(recordIds).toContain('CLI_AUTH_B_SUB_A');
                        expect(recordIds).toContain('CLI_AUTH_C_SUB_B');
                        expect(recordIds).toContain('CLI_AUTH_INDEPENDENT');
                    });
            });

            it('should allow subsidiary consultant to see ONLY clients within their subsidiary scope', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.length).toBe(2); // Only clients A and B from Subsidiary A
                        const recordIds = res.body.map(client => client.recordId);
                        expect(recordIds).toContain('CLI_AUTH_A_SUB_A');
                        expect(recordIds).toContain('CLI_AUTH_B_SUB_A');
                        // Should NOT see client in Subsidiary B or independent client
                        expect(recordIds).not.toContain('CLI_AUTH_C_SUB_B');
                        expect(recordIds).not.toContain('CLI_AUTH_INDEPENDENT');
                    });
            });

            it('should allow client grower to see ONLY their assigned client', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.length).toBe(1); // Only their specific client
                        expect(res.body[0].recordId).toBe('CLI_AUTH_A_SUB_A');
                        // Should NOT see other clients even in same subsidiary
                    });
            });

            it('should return 403 FORBIDDEN for field worker (lacks CLIENT_VIEW permission)', async () => {
                // REAL SYSTEM: Field workers do NOT have CLIENT_VIEW permission
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Client:View') guard
            });

            it('should return 403 FORBIDDEN for unauthorized user (no client permissions)', async () => {
                return request(app.getHttpServer())
                    .get('/clients')
                    .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                    .expect(403); // Blocked by @RequirePermission('Client:View') guard
            });
        });

        describe('GET /clients/:id - Single Client Access Control', () => {
            it('should allow subsidiary consultant to access clients within their subsidiary scope', async () => {
                return request(app.getHttpServer())
                    .get(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.recordId).toBe('CLI_AUTH_A_SUB_A');
                    });
            });

            it('should return 404 NOT FOUND for subsidiary consultant accessing client outside their scope', async () => {
                // Consultant assigned to Subsidiary A should not see client in Subsidiary B
                return request(app.getHttpServer())
                    .get(`/clients/${clientCinSubB._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(404); // Filtered out by visibility scope - from their perspective, it doesn't exist
            });

            it('should allow client grower to access ONLY their assigned client', async () => {
                return request(app.getHttpServer())
                    .get(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.recordId).toBe('CLI_AUTH_A_SUB_A');
                    });
            });

            it('should return 404 NOT FOUND for client grower accessing other clients in same subsidiary', async () => {
                // Grower assigned to Client A should not see Client B even in same subsidiary
                return request(app.getHttpServer())
                    .get(`/clients/${clientBinSubA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404); // Filtered out by client-level visibility scope
            });
        });

        describe('POST /clients - Client Creation Permission Control', () => {
            it('should allow ONLY platform administrator to create clients', async () => {
                const newClientData = {
                    name: 'Platform Admin Created Client',
                    subsidiaryId: testSubsidiaryA._id.toString()
                };

                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(newClientData)
                    .expect(201)
                    .expect((res) => {
                        expect(res.body.name).toBe('Platform Admin Created Client');
                        expect(res.body.recordId).toMatch(/^CLI\d+$/);
                    });
            });

            it('should return 403 FORBIDDEN for subsidiary consultant (lacks CLIENT_CREATE permission)', async () => {
                // REAL SYSTEM: Consultants do NOT have CLIENT_CREATE permission
                const unauthorizedData = {
                    name: 'Unauthorized Client Creation',
                    subsidiaryId: testSubsidiaryA._id.toString()
                };

                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(unauthorizedData)
                    .expect(403); // Blocked by @RequirePermission('Client:Create') guard
            });

            it('should return 403 FORBIDDEN for client grower (lacks CLIENT_CREATE permission)', async () => {
                // REAL SYSTEM: Growers cannot create clients
                const unauthorizedData = {
                    name: 'Grower Attempted Client',
                    subsidiaryId: testSubsidiaryA._id.toString()
                };

                return request(app.getHttpServer())
                    .post('/clients')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(unauthorizedData)
                    .expect(403); // Blocked by @RequirePermission('Client:Create') guard
            });
        });

        describe('PATCH /clients/:id - Client Update Permission Control', () => {
            it('should allow platform administrator to update any client', async () => {
                const updateData = { name: 'Updated by Platform Admin' };

                return request(app.getHttpServer())
                    .patch(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(updateData)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.name).toBe('Updated by Platform Admin');
                    });
            });

            it('should allow subsidiary consultant to update clients within their scope', async () => {
                const updateData = { name: 'Updated by Consultant' };

                return request(app.getHttpServer())
                    .patch(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(updateData)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.name).toBe('Updated by Consultant');
                    });
            });

            it('should return 404 NOT FOUND for subsidiary consultant updating client outside their scope', async () => {
                const updateData = { name: 'This should fail' };

                return request(app.getHttpServer())
                    .patch(`/clients/${clientCinSubB._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(updateData)
                    .expect(404); // Filtered out by visibility scope
            });

            it('should return 403 FORBIDDEN for client grower (lacks CLIENT_EDIT permission)', async () => {
                // REAL SYSTEM: Growers cannot edit clients
                const updateData = { name: 'Grower attempted update' };

                return request(app.getHttpServer())
                    .patch(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(updateData)
                    .expect(403); // Blocked by @RequirePermission('Client:Edit') guard
            });
        });

        describe('DELETE /clients/:id - Client Deletion Permission Control', () => {
            it('should allow ONLY platform administrator to delete clients', async () => {
                return request(app.getHttpServer())
                    .delete(`/clients/${clientBinSubA._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.isDeleted).toBe(true);
                        expect(res.body.isActive).toBe(false);
                    });
            });

            it('should return 403 FORBIDDEN for subsidiary consultant (lacks CLIENT_DELETE permission)', async () => {
                // REAL SYSTEM: Consultants do NOT have CLIENT_DELETE permission
                return request(app.getHttpServer())
                    .delete(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Client:Delete') guard
            });

            it('should return 403 FORBIDDEN for client grower (lacks CLIENT_DELETE permission)', async () => {
                // REAL SYSTEM: Growers cannot delete clients
                return request(app.getHttpServer())
                    .delete(`/clients/${clientAinSubA._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Client:Delete') guard
            });
        });

        describe('Nested Route Authorization - /clients/:clientId/* endpoints', () => {
            it('should return 404 NOT FOUND when accessing nested routes for clients outside visibility scope', async () => {
                // Grower trying to access users of a client they're not assigned to
                return request(app.getHttpServer())
                    .get(`/clients/${clientBinSubA._id}/users`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404); // Parent client filtered out by visibility scope
            });

            it('should return 403 FORBIDDEN when accessing nested routes without permission', async () => {
                // Field worker trying to access client users (no CLIENT_VIEW permission)
                return request(app.getHttpServer())
                    .get(`/clients/${clientAinSubA._id}/users`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by CLIENT_VIEW requirement for parent validation
            });

            it('should prevent bad actor from accessing orchards of clients they are not assigned to', async () => {
                // CRITICAL SECURITY TEST: Client-scoped user trying to access orchards from unauthorized client
                // This tests the real-world scenario of a malicious grower trying to see competitor orchards
                
                // Create orchards in both client A (authorized) and client B (unauthorized)
                await Promise.all([
                    new (app.get(getModelToken('Orchard')))({
                        recordId: 'AUTHORIZED_ORCHARD',
                        name: 'Growers Own Orchard',
                        clientId: clientAinSubA._id,
                        isActive: true
                    }).save(),
                    new (app.get(getModelToken('Orchard')))({
                        recordId: 'UNAUTHORIZED_ORCHARD',
                        name: 'Competitors Secret Orchard',
                        clientId: clientBinSubA._id,
                        isActive: true
                    }).save()
                ]);

                // Grower should be able to access orchards from their own client (Client A)
                await request(app.getHttpServer())
                    .get(`/clients/${clientAinSubA._id}/orchards`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].recordId).toBe('AUTHORIZED_ORCHARD');
                    });

                // BAD ACTOR ATTEMPT: Grower trying to access orchards from Client B (should fail)
                return request(app.getHttpServer())
                    .get(`/clients/${clientBinSubA._id}/orchards`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404) // Parent client should be filtered out by visibility scope
                    .then(() => {
                        // This 404 proves that the security model correctly prevents unauthorized orchard access
                        // The grower cannot even see that Client B exists, let alone its orchards
                    });
            });

            it('should prevent bad actor from accessing specific orchard by ID in unauthorized client', async () => {
                // CRITICAL SECURITY TEST: Direct orchard access attempt bypassing client filtering
                
                // Create orchard in unauthorized client B
                const unauthorizedOrchard = await new (app.get(getModelToken('Orchard')))({
                    recordId: 'SECRET_ORCHARD_DIRECT_ACCESS',
                    name: 'Top Secret Orchard Data',
                    clientId: clientBinSubA._id,
                    isActive: true
                }).save();

                // BAD ACTOR ATTEMPT: Grower trying direct access to specific orchard in unauthorized client
                return request(app.getHttpServer())
                    .get(`/clients/${clientBinSubA._id}/orchards/${unauthorizedOrchard._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404); // Parent client validation should prevent this
            });
        });
    });
});