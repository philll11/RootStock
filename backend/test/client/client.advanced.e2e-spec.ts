// backend/test/client/client.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Orchard, OrchardDocument } from '../../src/assets/orchards/schemas/orchard.schema';

describe('Clients Advanced Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let orchardModel: Model<OrchardDocument>;

    // Roles
    let clientOwnerRole: RoleDocument;

    // Personas & Tokens
    let globalAdminToken: string;
    let subsidiaryManagerToken: string;
    let clientOwnerToken: string;
    let fieldSupervisorToken: string;

    // Test Entities
    let agriSolutionsSub: SubsidiaryDocument;
    let competitorSub: SubsidiaryDocument;
    let premiumClient: ClientDocument;
    let competitorClient: ClientDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get models
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));

        // Create subsidiaries
        [agriSolutionsSub, competitorSub] = await subsidiaryModel.create([
            { recordId: 'AGRI_SOLUTIONS_ADV', name: 'Agricultural Solutions Advanced' },
            { recordId: 'COMPETITOR_SUB_ADV', name: 'Competitor Agricultural Services' },
        ]);

        // Create clients
        [premiumClient, competitorClient] = await clientModel.create([
            { recordId: 'PREMIUM_CLIENT_ADV', name: 'Premium Orchards Corporation', subsidiaryId: agriSolutionsSub._id },
            { recordId: 'COMPETITOR_CLIENT_ADV', name: 'Competitor Orchard Network', subsidiaryId: competitorSub._id },
        ]);

        // Create roles
        const [globalAdminRole, subManagerRole, localClientOwnerRole, fieldSupervisorRole] = await roleModel.create([
            { recordId: 'GLOBAL_ADMIN_ADV', name: 'Platform Administrator', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'SUB_MANAGER_ADV', name: 'Subsidiary Manager', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY },
            { recordId: 'CLIENT_OWNER_ADV', name: 'Orchard Owner', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'FIELD_SUPERVISOR_ADV', name: 'Field Supervisor', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.CLIENT },
        ]);
        clientOwnerRole = localClientOwnerRole;

        // Create users (personas)
        const [globalAdmin, subManager, clientOwner, fieldSupervisor] = await userModel.create([
            { recordId: 'GLOBAL_ADMIN_USER_ADV', name: 'Platform Admin', firstName: 'Global', lastName: 'Admin', email: 'global.admin@example.com', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id, clientIds: [] },
            { recordId: 'SUB_MANAGER_USER_ADV', name: 'Subsidiary Manager', firstName: 'Sub', lastName: 'Manager', email: 'sub.manager@example.com', userType: UserType.EMPLOYEE, roleId: subManagerRole._id, clientIds: [premiumClient._id] },
            { recordId: 'CLIENT_OWNER_USER_ADV', name: 'Client Owner', firstName: 'Client', lastName: 'Owner', email: 'client.owner@example.com', userType: UserType.CONTACT, roleId: clientOwnerRole._id, clientIds: [premiumClient._id] },
            { recordId: 'FIELD_SUPERVISOR_USER_ADV', name: 'Field Supervisor', firstName: 'Field', lastName: 'Supervisor', email: 'field.supervisor@example.com', userType: UserType.CONTACT, roleId: fieldSupervisorRole._id, clientIds: [premiumClient._id] },
        ]);

        // Generate tokens
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });
        subsidiaryManagerToken = jwtService.sign({ sub: subManager.recordId, tokenVersion: 0 });
        clientOwnerToken = jwtService.sign({ sub: clientOwner.recordId, tokenVersion: 0 });
        fieldSupervisorToken = jwtService.sign({ sub: fieldSupervisor.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('Deactivation Business Rules', () => {
        it('should fail with 409 when deactivating a client with active users', async () => {
            const testClient = await clientModel.create({ recordId: 'C_ACTIVE_USER', name: 'Client With Active User', subsidiaryId: agriSolutionsSub._id });
            await userModel.create({
                recordId: 'U_ACTIVE',
                name: 'Active User',
                firstName: 'Active',
                lastName: 'User',
                email: 'active.user@example.com',
                userType: UserType.CONTACT,
                clientIds: [testClient._id],
                roleId: clientOwnerRole._id,
                isActive: true,
            });

            await request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false, __v: 0 })
                .expect(409);
        });

        it('should fail with 409 when deactivating a client with active orchards', async () => {
            const testClient = await clientModel.create({ recordId: 'C_ACTIVE_ORCHARD', name: 'Client With Active Orchard', subsidiaryId: agriSolutionsSub._id });
            await orchardModel.create({ recordId: 'O_ACTIVE', name: 'Active Orchard', clientId: testClient._id, isActive: true });

            await request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false, __v: 0 })
                .expect(409);
        });

        it('should succeed deactivating a client after its dependent entities are deactivated', async () => {
            const testClient = await clientModel.create({ recordId: 'C_TO_DEACTIVATE', name: 'Client To Deactivate', subsidiaryId: agriSolutionsSub._id });
            const testUser = await userModel.create({
                recordId: 'U_TO_DEACTIVATE',
                name: 'User To Deactivate',
                firstName: 'User',
                lastName: 'To Deactivate',
                email: 'user.to.deactivate@example.com',
                userType: UserType.CONTACT,
                clientIds: [testClient._id],
                roleId: clientOwnerRole._id,
                isActive: true,
            });
            const testOrchard = await orchardModel.create({ recordId: 'O_TO_DEACTIVATE', name: 'Orchard To Deactivate', clientId: testClient._id, isActive: true });

            // Deactivate dependencies first
            await userModel.findByIdAndUpdate(testUser._id, { isActive: false });
            await orchardModel.findByIdAndUpdate(testOrchard._id, { isActive: false });

            // Now, deactivating the client should succeed
            await request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false, __v: 0 })
                .expect(200);
        });
    });

    describe('User Scopes and Permissions', () => {
        it('should allow a Global Admin to see clients in any subsidiary', async () => {
            await request(app.getHttpServer())
                .get(`/clients/${competitorClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);
        });

        it('should return 404 for a Subsidiary Manager trying to access a client in another subsidiary', async () => {
            // The subsidiaryManager is scoped to agriSolutionsSub, but competitorClient is in competitorSub
            await request(app.getHttpServer())
                .get(`/clients/${competitorClient._id}`)
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                .expect(404);
        });

        it('should allow a Client Owner to view their own client data', async () => {
            await request(app.getHttpServer())
                .get(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200);
        });

        it('should return 403 for a Field Supervisor trying to view client data (lacks CLIENT_VIEW permission)', async () => {
            await request(app.getHttpServer())
                .get(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                .expect(403);
        });
    });

    describe('Transactional Deletion', () => {
        it('should correctly update users and orchards when a client is deleted', async () => {
            const clientToDelete = await clientModel.create({ recordId: 'C_TO_DELETE_TRANS', name: 'Client To Delete', subsidiaryId: agriSolutionsSub._id });
            const otherClient = await clientModel.create({ recordId: 'C_OTHER_TRANS', name: 'Other Client', subsidiaryId: agriSolutionsSub._id });

            // User assigned to the client-to-delete AND another client
            const multiClientUser = await userModel.create({
                recordId: 'U_MULTI_CLIENT',
                name: 'Multi-Client User',
                firstName: 'Multi',
                lastName: 'Client',
                email: 'multi.client@example.com',
                userType: UserType.CONTACT,
                clientIds: [clientToDelete._id, otherClient._id],
                roleId: clientOwnerRole._id,
            });
            // User assigned ONLY to the client-to-delete
            const singleClientUser = await userModel.create({
                recordId: 'U_SINGLE_CLIENT',
                name: 'Single-Client User',
                firstName: 'Single',
                lastName: 'Client',
                email: 'single.client@example.com',
                userType: UserType.CONTACT,
                clientIds: [clientToDelete._id],
                roleId: clientOwnerRole._id,
            });
            // Orchard belonging to the client-to-delete
            const orchardToDelete = await orchardModel.create({ recordId: 'O_TO_DELETE_TRANS', name: 'Orchard To Delete', clientId: clientToDelete._id });

            // Delete the client
            await request(app.getHttpServer())
                .delete(`/clients/${clientToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Assertions
            const updatedMultiClientUser = await userModel.findById(multiClientUser._id);
            expect(updatedMultiClientUser).not.toBeNull();
            expect(updatedMultiClientUser!.clientIds.map(String)).toEqual([otherClient._id.toString()]);

            const updatedSingleClientUser = await userModel.findById(singleClientUser._id);
            expect(updatedSingleClientUser).not.toBeNull();
            expect(updatedSingleClientUser!.clientIds).toHaveLength(0);

            const updatedOrchard = await orchardModel.findById(orchardToDelete._id);
            expect(updatedOrchard).not.toBeNull();
            expect(updatedOrchard!.isDeleted).toBe(true);
        });
    });

    describe('Concurrency', () => {
        it('should handle concurrent deletion attempts on the same client gracefully', async () => {
            const clientToConcurrentlyDelete = await clientModel.create({ recordId: 'C_CONCURRENT_DELETE', name: 'Concurrent Delete Target' });

            // Fire off three deletion requests at the same time
            const [res1, res2, res3] = await Promise.all([
                request(app.getHttpServer()).delete(`/clients/${clientToConcurrentlyDelete._id}`).set('Authorization', `Bearer ${globalAdminToken}`),
                request(app.getHttpServer()).delete(`/clients/${clientToConcurrentlyDelete._id}`).set('Authorization', `Bearer ${globalAdminToken}`),
                request(app.getHttpServer()).delete(`/clients/${clientToConcurrentlyDelete._id}`).set('Authorization', `Bearer ${globalAdminToken}`),
            ]);

            // Check that all requests completed and at least one was successful (200)
            const statuses = [res1.status, res2.status, res3.status];
            expect(statuses).toContain(200);

            // The others will be 404s because the client is already gone, which is correct.
            const finalClient = await clientModel.findById(clientToConcurrentlyDelete._id);
            expect(finalClient).not.toBeNull();
            expect(finalClient!.isDeleted).toBe(true);
        });
    });

    describe('Immutable Fields', () => {
        it('should return 400 and not allow changing the subsidiaryId of a client', async () => {
            const originalSubsidiaryId = premiumClient?.subsidiaryId?.toString();

            await request(app.getHttpServer())
                .patch(`/clients/${premiumClient._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ subsidiaryId: competitorSub._id }) // Attempt to change the subsidiary
                .expect(400); // The request should fail with a 400 error

            const updatedClient = await clientModel.findById(premiumClient._id);
            expect(updatedClient).not.toBeNull();
            expect(updatedClient!.subsidiaryId!.toString()).toEqual(originalSubsidiaryId);
        });
    });
});