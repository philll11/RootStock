import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../../src/orchards/schemas/orchard.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Orchards Authorization & Security - Agricultural Business Scenarios (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Tokens
    let platformAdminToken: string, regionManagerToken: string, farmOwnerToken: string, consultantToken: string, unauthorizedUserToken: string;

    // Entities
    let appleOrchardClient: ClientDocument, citrusGroveClient: ClientDocument, berryFarmClient: ClientDocument, independentGrowerClient: ClientDocument;
    let orchardA: OrchardDocument, orchardB: OrchardDocument, orchardC: OrchardDocument;
    let caliManager: UserDocument, caliContact: UserDocument, oregonContact: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        // --- Single, Consolidated Setup ---
        const [californiaSubsidiary, oregonSubsidiary] = await subsidiaryModel.create([
            { recordId: 'SUB_CA', name: 'California Ag Solutions' },
            { recordId: 'SUB_OR', name: 'Oregon Fruit Co-op' },
        ]);

        [appleOrchardClient, citrusGroveClient, berryFarmClient, independentGrowerClient] = await clientModel.create([
            { recordId: 'CLI_APPLE', name: 'Premium Apple Orchards', subsidiaryId: californiaSubsidiary._id },
            { recordId: 'CLI_CITRUS', name: 'Valley Citrus Grove', subsidiaryId: californiaSubsidiary._id },
            { recordId: 'CLI_BERRY', name: 'Mountain Berry Farm', subsidiaryId: oregonSubsidiary._id },
            { recordId: 'CLI_INDEP', name: 'Independent Family Farm', subsidiaryId: null },
        ]);

        const [adminRole, managerRole, ownerRole, contactRole, consultantRole, noPermsRole] = await roleModel.create([
            { recordId: 'ADM_ROL', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'MGR_ROL', name: 'Manager', permissions: [PERMISSIONS.ORCHARD_CREATE, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT, PERMISSIONS.CLIENT_VIEW, PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY },
            { recordId: 'OWN_ROL', name: 'Owner', permissions: [PERMISSIONS.ORCHARD_CREATE, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'CON_ROL', name: 'Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'CONS_ROL', name: 'Consultant', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'NO_PERMS', name: 'No Perms', permissions: [], visibilityScope: VisibilityScope.CLIENT },
        ]);

        const [adminUser, managerUser, ownerUser, consultantUser, unauthUser] = await userModel.create([
            { recordId: 'ADMIN', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'MANAGER', name: 'Manager', firstName: 'Manager', lastName: 'User', email: 'manager@test.com', userType: UserType.EMPLOYEE, roleId: managerRole._id, clientIds: [appleOrchardClient._id] },
            { recordId: 'OWNER', name: 'Owner', firstName: 'Owner', lastName: 'User', email: 'owner@test.com', userType: UserType.EMPLOYEE, roleId: ownerRole._id, clientIds: [appleOrchardClient._id] },
            { recordId: 'CONSULTANT', name: 'Consultant', firstName: 'Consultant', lastName: 'User', email: 'consultant@test.com', userType: UserType.EMPLOYEE, roleId: consultantRole._id, clientIds: [appleOrchardClient._id] },
            { recordId: 'UNAUTH', name: 'Unauth', firstName: 'Unauth', lastName: 'User', email: 'unauth@test.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id, clientIds: [appleOrchardClient._id] },
        ]);

        [caliManager, caliContact, oregonContact] = await userModel.create([
            { recordId: 'MGR_CA_2', name: 'Cali Manager 2', firstName: 'Cali', lastName: 'Mgr', email: 'mgr2@ca.com', userType: UserType.EMPLOYEE, roleId: managerRole._id, clientIds: [citrusGroveClient._id] },
            { recordId: 'CONTACT_CA', name: 'Cali Contact', firstName: 'Cali', lastName: 'Contact', email: 'contact@ca.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [citrusGroveClient._id] },
            { recordId: 'CONTACT_OR', name: 'Oregon Contact', firstName: 'Oregon', lastName: 'Contact', email: 'contact@or.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [berryFarmClient._id] },
        ]);

        platformAdminToken = jwtService.sign({ sub: adminUser.recordId });
        regionManagerToken = jwtService.sign({ sub: managerUser.recordId });
        farmOwnerToken = jwtService.sign({ sub: ownerUser.recordId });
        consultantToken = jwtService.sign({ sub: consultantUser.recordId });
        unauthorizedUserToken = jwtService.sign({ sub: unauthUser.recordId });

        [orchardA, orchardB, orchardC] = await orchardModel.create([
            { recordId: 'ORCH_A', name: 'Orchard A', clientId: appleOrchardClient._id },
            { recordId: 'ORCH_B', name: 'Orchard B', clientId: citrusGroveClient._id },
            { recordId: 'ORCH_C', name: 'Orchard C', clientId: berryFarmClient._id },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    
    // --- READ Operations (GET) ---
    describe('Layer 2 - Data Visibility Scope (Read)', () => {
        it('Global Admin should see ALL orchards', async () => {
            const res = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            expect(res.body).toHaveLength(3);
        });
        it('Subsidiary Manager should see ONLY orchards within their subsidiary', async () => {
            const res = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${regionManagerToken}`).expect(200);
            expect(res.body.map(o => o.recordId)).toEqual(expect.arrayContaining(['ORCH_A', 'ORCH_B']));
            expect(res.body).toHaveLength(2);
        });
        it('Client Owner should see ONLY orchards on their assigned client', async () => {
            const res = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${farmOwnerToken}`).expect(200);
            expect(res.body[0].recordId).toBe('ORCH_A');
            expect(res.body).toHaveLength(1);
        });
        it('should return 404 when trying to GET an orchard outside of scope', async () => {
            await request(app.getHttpServer()).get(`/orchards/${orchardC._id}`).set('Authorization', `Bearer ${farmOwnerToken}`).expect(404);
        });
        it('should return 403 for a user without ORCHARD_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${unauthorizedUserToken}`).expect(403);
        });
    });

    // --- WRITE Operations (POST, PATCH, DELETE) ---
    describe('Layer 1 & 3 - Actions and Business Rules (Write)', () => {

        describe('POST /orchards - Creation Rules', () => {
            it('should allow a user with ORCHARD_CREATE to create an orchard', async () => {
                await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ name: 'New Orchard Alpha', clientId: appleOrchardClient._id.toString() }).expect(201);
            });
            it('should FORBID a user without ORCHARD_CREATE permission (Layer 1)', async () => {
                await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${consultantToken}`)
                    .send({ name: 'Should Fail', clientId: appleOrchardClient._id.toString() }).expect(403);
            });
            it('should FORBID creating an orchard on a client outside of scope (Layer 2)', async () => {
                await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ name: 'Should Fail', clientId: berryFarmClient._id.toString() }).expect(404); // returns 404 because client isn't found
            });
        });

        describe('PATCH /orchards/:id - Update Rules', () => {
            let testOrchard: OrchardDocument;
            beforeEach(async () => {
                testOrchard = await orchardModel.create({ recordId: 'ORCH_TEST_UPDATE', name: 'Test Update Orchard', clientId: appleOrchardClient._id });
            });
            afterEach(async () => {
                await orchardModel.deleteOne({ _id: testOrchard._id });
            });

            it('should allow a user with ORCHARD_EDIT to update an orchard in their scope', async () => {
                await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ name: 'Updated Name' }).expect(200);
            });
            it('should FORBID a user without ORCHARD_EDIT permission (Layer 1)', async () => {
                await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${consultantToken}`)
                    .send({ name: 'Should Fail' }).expect(403);
            });
            it('should FORBID updating the clientId (Layer 3 - Immutability)', async () => {
                await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ clientId: berryFarmClient._id.toString() })
                    .expect(400); // Bad Request because clientId is not in DTO whitelist
            });
        });

        describe('DELETE /orchards/:id - Deletion Rules', () => {
            it('should allow a user with ORCHARD_DELETE to delete an orchard (Platform Admin)', async () => {
                const tempOrchard = await orchardModel.create({ recordId: 'TEMP_ORCH', name: 'To Delete', clientId: appleOrchardClient._id });
                await request(app.getHttpServer()).delete(`/orchards/${tempOrchard._id}`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            });
            it('should FORBID a user without ORCHARD_DELETE permission (Farm Owner)', async () => {
                const tempOrchard = await orchardModel.create({ recordId: 'TEMP_ORCH_2', name: 'To Delete 2', clientId: appleOrchardClient._id });
                await request(app.getHttpServer()).delete(`/orchards/${tempOrchard._id}`).set('Authorization', `Bearer ${farmOwnerToken}`).expect(403);
            });
        });

        // --- NEW: Smart Assignment Tests ---
        describe('PATCH /orchards/:id - Smart Assignment Feature', () => {
            let orchardToTest: OrchardDocument;
            beforeEach(async () => {
                orchardToTest = await orchardModel.create({ recordId: 'ORCH_ASSIGN', name: 'Assignment Orchard', clientId: appleOrchardClient._id });
            });
            afterEach(async () => {
                await orchardModel.deleteOne({_id: orchardToTest._id});
                // Reset the user's client list
                await userModel.updateOne({_id: caliManager._id}, {$pull: {clientIds: appleOrchardClient._id}});
            })

            it('should automatically assign a subsidiary user to the parent client when added to an orchard', async () => {
                // caliManager is assigned to citrusGroveClient, NOT appleOrchardClient.
                // This test proves they are automatically added to appleOrchardClient.
                let manager = await userModel.findById(caliManager._id);
                expect(manager!.clientIds.map(id => id.toString())).not.toContain(appleOrchardClient._id.toString());

                await request(app.getHttpServer()).patch(`/orchards/${orchardToTest._id}`).set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ userIds: [caliManager._id.toString()] }).expect(200);

                manager = await userModel.findById(caliManager._id);
                expect(manager!.clientIds.map(id => id.toString())).toContain(appleOrchardClient._id.toString());
            });

            it('should NOT be able to assign a contact from a DIFFERENT subsidiary (Layer 3)', async () => {
                // regionManager (Sub A) tries to assign a contact from Sub B. This must fail.
                // The findOne check in _manageUserAssignmentsInTransaction should throw 404 because the manager can't see the oregonContact.
                await request(app.getHttpServer()).patch(`/orchards/${orchardToTest._id}`).set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ userIds: [oregonContact._id.toString()] }).expect(404);
            });

            it('should successfully assign a contact from the SAME subsidiary', async () => {
                // regionManager (Sub A) assigns a contact also from Sub A.
                // Smart Assignment should add them to the appleOrchardClient.
                let contact = await userModel.findById(caliContact._id);
                expect(contact!.clientIds.map(id => id.toString())).not.toContain(appleOrchardClient._id.toString());

                await request(app.getHttpServer()).patch(`/orchards/${orchardToTest._id}`).set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ userIds: [caliContact._id.toString()] }).expect(200);

                contact = await userModel.findById(caliContact._id);
                expect(contact!.clientIds.map(id => id.toString())).toContain(appleOrchardClient._id.toString());
            });
        });
    });
});