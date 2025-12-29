// backend/test/client/client.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Clients Authorization & Security (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // User Tokens
    let platformAdminToken: string;
    let subsidiaryManagerToken: string;
    let clientOwnerToken: string;
    let unauthorizedUserToken: string;

    // Test Data Entities
    let subA: SubsidiaryDocument, subB: SubsidiaryDocument;
    let clientA_subA: ClientDocument, clientB_subA: ClientDocument, clientC_subB: ClientDocument, independentClient: ClientDocument;
    let adminUser: UserDocument, managerUser: UserDocument, ownerUser: UserDocument, unauthUser: UserDocument, genericEmployeeUser: UserDocument;
    let adminRole: RoleDocument, managerRole: RoleDocument, ownerRole: RoleDocument, contactRole: RoleDocument, noPermsRole: RoleDocument;
    let contactUser_subA: UserDocument, contactUser_subB: UserDocument, standaloneContact: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        [subA, subB] = await app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name)).create([
            { recordId: 'SUB_A', name: 'Subsidiary A' },
            { recordId: 'SUB_B', name: 'Subsidiary B' },
        ]);

        [clientA_subA, clientB_subA, clientC_subB, independentClient] = await clientModel.create([
            { recordId: 'CLI_A', name: 'Client A in Sub A', subsidiaryId: subA._id },
            { recordId: 'CLI_B', name: 'Client B in Sub A', subsidiaryId: subA._id },
            { recordId: 'CLI_C', name: 'Client C in Sub B', subsidiaryId: subB._id },
            { recordId: 'CLI_INDEPENDENT', name: 'Independent Client', subsidiaryId: null },
        ]);

        [adminRole, managerRole, ownerRole, contactRole, noPermsRole] = await roleModel.create([
            { recordId: 'admin', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'manager', name: 'Manager', permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_EDIT, PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY },
            { recordId: 'owner', name: 'Owner', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'contact', name: 'Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'no_perms', name: 'No Perms', permissions: [], visibilityScope: VisibilityScope.CLIENT },
        ]);

        [adminUser, managerUser, ownerUser, unauthUser, genericEmployeeUser] = await userModel.create([
            { recordId: 'ADMIN', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'MANAGER', name: 'Manager', firstName: 'Manager', lastName: 'User', email: 'manager@test.com', userType: UserType.EMPLOYEE, roleId: managerRole._id, clientIds: [clientA_subA._id] },
            { recordId: 'OWNER', name: 'Owner', firstName: 'Owner', lastName: 'User', email: 'owner@test.com', userType: UserType.EMPLOYEE, roleId: ownerRole._id, clientIds: [clientA_subA._id] },
            { recordId: 'UNAUTH', name: 'Unauth', firstName: 'Unauth', lastName: 'User', email: 'unauth@test.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id, clientIds: [clientA_subA._id] },
            { recordId: 'GENERIC_EMPLOYEE', name: 'Generic Employee', firstName: 'Generic', lastName: 'Employee', email: 'generic@employee.com', userType: UserType.EMPLOYEE, roleId: managerRole._id }
        ]);

        [contactUser_subA, contactUser_subB, standaloneContact] = await userModel.create([
            { recordId: 'CONTACT_A', name: 'Contact A', firstName: 'Contact', lastName: 'A', email: 'contact_a@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [clientB_subA._id] },
            { recordId: 'CONTACT_B', name: 'Contact B', firstName: 'Contact', lastName: 'B', email: 'contact_b@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [clientC_subB._id] },
            { recordId: 'STANDALONE', name: 'Standalone', firstName: 'Standalone', lastName: 'User', email: 'standalone@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [independentClient._id] },
        ]);

        platformAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        subsidiaryManagerToken = jwtService.sign({ sub: managerUser.recordId, tokenVersion: 0 });
        clientOwnerToken = jwtService.sign({ sub: ownerUser.recordId, tokenVersion: 0 });
        unauthorizedUserToken = jwtService.sign({ sub: unauthUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    // --- READ Operations (GET) ---
    describe('Layer 2 - Data Visibility Scope (Read)', () => {
        it('Global Admin should see ALL clients', async () => {
            const res = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            expect(res.body.map(c => c.recordId)).toEqual(expect.arrayContaining(['CLI_A', 'CLI_B', 'CLI_C']));
        });
        it('Subsidiary Manager should see ONLY clients in their subsidiary', async () => {
            const res = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(200);
            expect(res.body.map(c => c.recordId)).toEqual(expect.arrayContaining(['CLI_A', 'CLI_B']));
            expect(res.body.map(c => c.recordId)).not.toContain('CLI_C');
        });
        it('Client Owner should see ONLY their assigned client', async () => {
            const res = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${clientOwnerToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('CLI_A');
        });
        it('should return 403 for a user without CLIENT_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${unauthorizedUserToken}`).expect(403);
        });
        it('should return 404 for a user trying to GET a client outside their scope', async () => {
            await request(app.getHttpServer()).get(`/clients/${clientC_subB._id}`).set('Authorization', `Bearer ${clientOwnerToken}`).expect(404);
        });
    });

    // --- WRITE Operations (POST, PATCH, DELETE) ---
    describe('Layer 1 & 3 - Actions and Business Rules (Write)', () => {

        // --- CREATE Tests ---
        describe('POST /clients', () => {
            it('should allow a user with CLIENT_CREATE to create a client', async () => {
                await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ name: 'New Client', subsidiaryId: subA._id.toString() }).expect(201);
            });
            it('should FORBID a user without CLIENT_CREATE permission', async () => {
                await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send({ name: 'New Client', subsidiaryId: subA._id.toString() }).expect(403);
            });
        });

        // --- UPDATE Tests ---
        describe('PATCH /clients/:id', () => {
            it('should allow a user with CLIENT_EDIT to update a client in their scope', async () => {
                const current = await request(app.getHttpServer()).get(`/clients/${clientA_subA._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(200);
                await request(app.getHttpServer()).patch(`/clients/${clientA_subA._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send({ name: "Updated Name", __v: current.body.__v }).expect(200);
            });
            it('should FORBID a user without CLIENT_EDIT permission', async () => {
                await request(app.getHttpServer()).patch(`/clients/${clientA_subA._id}`).set('Authorization', `Bearer ${clientOwnerToken}`)
                    .send({ name: "Updated Name", __v: 0 }).expect(403);
            });
            it('should FORBID a user from updating a client outside their scope (returns 404)', async () => {
                await request(app.getHttpServer()).patch(`/clients/${clientC_subB._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send({ name: "Updated Name", __v: 0 }).expect(404);
            });
            it('should FORBID changing the subsidiaryId (Layer 3 - Immutability)', async () => {
                await request(app.getHttpServer()).patch(`/clients/${clientA_subA._id}`).set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ subsidiaryId: subB._id.toString(), __v: 0 })
                    .expect(400); // Bad Request because subsidiaryId is not in the DTO whitelist
            });
        });

        // --- DELETE Tests ---
        describe('DELETE /clients/:id', () => {
            it('should allow a user with CLIENT_DELETE to delete a client', async () => {
                const tempClient = await clientModel.create({ recordId: 'TEMP_CLI', name: 'To Be Deleted' });
                await request(app.getHttpServer()).delete(`/clients/${tempClient._id}`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            });
            it('should FORBID a user without CLIENT_DELETE permission', async () => {
                await request(app.getHttpServer()).delete(`/clients/${clientA_subA._id}`).set('Authorization', `Bearer ${subsidiaryManagerToken}`).expect(403);
            });
        });

        // --- User Assignment Tests (PUT /clients/:id/users) ---
        describe('PUT /clients/:id/users - User Assignment Rules', () => {
            it('should allow a manager to assign a user within their subsidiary', async () => {
                await request(app.getHttpServer()).put(`/clients/${clientA_subA._id}/users`).set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send({ userIds: [contactUser_subA._id.toString()] }).expect(204);
                const client = await clientModel.findById(clientA_subA._id);
                const user = await userModel.findById(contactUser_subA._id);
                // The assignUsers method should have added clientA to the contact's list
                expect(user).toBeDefined();
                expect(user!.clientIds.map(id => id.toString())).toContain(clientA_subA._id.toString());
            });

            it('should FORBID a manager from assigning a CONTACT from a DIFFERENT subsidiary (Layer 3)', async () => {
                // The manager can see Client A, but the contact from Sub B is not a valid assignment.
                await request(app.getHttpServer()).put(`/clients/${clientA_subA._id}/users`).set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send({ userIds: [contactUser_subB._id.toString()] })
                    .expect(404); // Not Found due to business rule violation
            });

            it('should FORBID a user without CLIENT_EDIT permission from assigning users', async () => {
                await request(app.getHttpServer()).put(`/clients/${clientA_subA._id}/users`).set('Authorization', `Bearer ${clientOwnerToken}`)
                    .send({ userIds: [contactUser_subA._id.toString()] })
                    .expect(403);
            });
        });
        describe('PUT /clients/:id/users - Standalone Client Silo Rules', () => {
            it('should allow an admin to assign an EMPLOYEE user to a standalone client', async () => {
                await request(app.getHttpServer())
                    .put(`/clients/${independentClient._id}/users`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ userIds: [genericEmployeeUser._id.toString()] })
                    .expect(204);

                const updatedUser = await userModel.findById(genericEmployeeUser._id);
                expect(updatedUser!.clientIds.map(id => id.toString())).toContain(independentClient._id.toString());
            });

            it('should FORBID an admin from assigning a CONTACT from a subsidiary to a standalone client (Layer 3)', async () => {
                // contactUser_subA belongs to Subsidiary A. This assignment should fail.
                await request(app.getHttpServer())
                    .put(`/clients/${independentClient._id}/users`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ userIds: [contactUser_subA._id.toString()] })
                    .expect(400); // Bad Request, violates the data silo rule
            });

            it('should allow an admin to re-assign a CONTACT who already belongs to that standalone client', async () => {
                // This confirms the logic isn't just blocking all contacts.
                // The user is already on the client, so this is a valid state.
                await request(app.getHttpServer())
                    .put(`/clients/${independentClient._id}/users`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ userIds: [standaloneContact._id.toString()] })
                    .expect(204);
            });
        });
    });
});