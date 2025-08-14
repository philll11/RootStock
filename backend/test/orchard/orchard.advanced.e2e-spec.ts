import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Orchard, OrchardDocument } from '../../src/orchards/schemas/orchard.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Orchards Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let clientModel: Model<ClientDocument>;
    let orchardModel: Model<OrchardDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let jwtService: JwtService;

    let adminToken: string;
    let clientUserToken: string;
    let clientA: ClientDocument;
    let clientB: ClientDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        jwtService = app.get<JwtService>(JwtService);

        // Create Roles
        const adminRole = await new roleModel({ recordId: 'ROLE_O_ADV_ADMIN', name: 'Orchard Adv Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const clientScopeRole = await new roleModel({ recordId: 'ROLE_O_ADV_CLIENT', name: 'Orchard Adv Client', permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();

        // Create Users and Tokens
        const adminUser = await new userModel({ recordId: 'USER_O_ADV_ADMIN', name: 'Orchard Adv Admin', firstName: 'Adv', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
        
        // Setup for nested route security test
        clientA = await new clientModel({ recordId: 'CLI_A_O_ADV', name: 'Client A' }).save();
        clientB = await new clientModel({ recordId: 'CLI_B_O_ADV', name: 'Client B' }).save();

        const clientScopedUser = await new userModel({ recordId: 'USER_O_CLIENT_SCOPE', name: 'Client Scope User', firstName: 'Client', lastName: 'Scope', userType: UserType.CONTACT, roleId: clientScopeRole._id, clientIds: [clientA._id] }).save();
        clientUserToken = jwtService.sign({ sub: clientScopedUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean relevant collections before each test, preserving global data
        await orchardModel.deleteMany({});
    });

    describe('Parent Resource Inactivation Pre-Condition', () => {
        it('should FAIL with 409 Conflict when deactivating a client that has an active orchard', async () => {
            const clientWithOrchard = await new clientModel({ recordId: 'CLI_WITH_ORCH', name: 'Client With Orchard' }).save();
            await new orchardModel({ recordId: 'ACTIVE_ORCHARD', name: 'Active Orchard', clientId: clientWithOrchard._id }).save();

            // This tests the logic in ClientsService, which is a key interaction for the Orchard resource
            return request(app.getHttpServer())
                .patch(`/clients/${clientWithOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This client cannot be deactivated because it has 1 active orchard(s).');
                });
        });

        it('should SUCCEED deactivating a client if its orchards are inactive', async () => {
            const clientWithInactiveOrchard = await new clientModel({ recordId: 'CLI_WITH_INACTIVE_ORCH', name: 'Client With Inactive Orchard' }).save();
            await new orchardModel({ recordId: 'INACTIVE_ORCHARD', name: 'Inactive Orchard', clientId: clientWithInactiveOrchard._id, isActive: false }).save();

            return request(app.getHttpServer())
                .patch(`/clients/${clientWithInactiveOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(200);
        });
    });

    describe('Transactional Delete', () => {
        it('should SUCCEED and atomically soft-delete child orchards when a parent client is deleted', async () => {
            const clientToDelete = await new clientModel({ recordId: 'CLI_TO_DEL_O', name: 'Client To Delete' }).save();
            const orchard1 = await new orchardModel({ recordId: 'O1_DEL', name: 'Orchard 1', clientId: clientToDelete._id }).save();
            const orchard2 = await new orchardModel({ recordId: 'O2_DEL', name: 'Orchard 2', clientId: clientToDelete._id }).save();
            
            // This tests the transactional logic in ClientsService
            await request(app.getHttpServer())
                .delete(`/clients/${clientToDelete._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const updatedOrchard1 = await orchardModel.findById(orchard1._id);
            const updatedOrchard2 = await orchardModel.findById(orchard2._id);

            expect(updatedOrchard1).not.toBeNull();
            expect(updatedOrchard2).not.toBeNull();
            expect(updatedOrchard1!.isDeleted).toBe(true);
            expect(updatedOrchard2!.isDeleted).toBe(true);
        });

        it.todo('should atomically disassociate linked Blocks when an Orchard is deleted');
    });

    describe('Nested Route Security', () => {
        it('GET /clients/:clientId/orchards should FAIL with 404 for a user who cannot see the parent client', () => {
            // The user is assigned to Client A, but is trying to access orchards for Client B.
            return request(app.getHttpServer())
                .get(`/clients/${clientB._id}/orchards`)
                .set('Authorization', `Bearer ${clientUserToken}`)
                .expect(404);
        });

        it('GET /clients/:clientId/orchards should SUCCEED for a user who can see the parent client', () => {
            // The user is assigned to Client A and is trying to access orchards for Client A.
            return request(app.getHttpServer())
                .get(`/clients/${clientA._id}/orchards`)
                .set('Authorization', `Bearer ${clientUserToken}`)
                .expect(200);
        });
    });

    describe('Advanced Query Filters', () => {
        it('should SUCCEED returning soft-deleted records when ?isDeleted=true', async () => {
            const deletedOrchard = await new orchardModel({ recordId: 'ORCH_DELETED', name: 'Deleted Orchard', clientId: clientA._id, isDeleted: true, isActive: false }).save();
            return request(app.getHttpServer())
                .get('/orchards?isDeleted=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThan(0);
                    const found = res.body.some(o => o._id === deletedOrchard._id.toString());
                    expect(found).toBe(true);
                });
        });

        it('should SUCCEED returning inactive records when ?includeInactives=true', async () => {
            await new orchardModel({ recordId: 'ORCH_ACTIVE', name: 'Active Orchard', clientId: clientA._id, isActive: true }).save();
            await new orchardModel({ recordId: 'ORCH_INACTIVE', name: 'Inactive Orchard', clientId: clientA._id, isActive: false }).save();

            return request(app.getHttpServer())
                .get('/orchards?includeInactives=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    const activeOrchard = res.body.find(o => o.recordId === 'ORCH_ACTIVE');
                    const inactiveOrchard = res.body.find(o => o.recordId === 'ORCH_INACTIVE');
                    expect(activeOrchard).toBeDefined();
                    expect(inactiveOrchard).toBeDefined();
                });
        });
    });
});