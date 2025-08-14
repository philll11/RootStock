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

describe('OrchardsController (e2e) - Authorization & Scopes', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Tokens
    let adminToken: string;
    let editorToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Create a set of roles with varying permissions for Orchards
        const adminRole = await new roleModel({ recordId: 'ROLE_O_ADMIN', name: 'Orchard Super Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const editorRole = await new roleModel({ recordId: 'ROLE_O_EDITOR', name: 'Orchard Editor', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewOnlyRole = await new roleModel({ recordId: 'ROLE_O_VIEWER', name: 'Orchard Viewer', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsRole = await new roleModel({ recordId: 'ROLE_O_NO_PERMS', name: 'Orchard No Perms', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();

        // Create users for each role with complete data
        const adminUser = await new userModel({ recordId: 'USER_O_ADMIN', name: 'Admin User', firstName: 'Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        const editorUser = await new userModel({ recordId: 'USER_O_EDITOR', name: 'Editor User', firstName: 'Editor', lastName: 'User', userType: UserType.EMPLOYEE, roleId: editorRole._id }).save();
        const viewOnlyUser = await new userModel({ recordId: 'USER_O_VIEWER', name: 'Viewer User', firstName: 'Viewer', lastName: 'User', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id }).save();
        const noPermsUser = await new userModel({ recordId: 'USER_O_NO_PERMS', name: 'No Perms User', firstName: 'No', lastName: 'Perms', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();

        // Generate tokens
        adminToken = jwtService.sign({ sub: adminUser.recordId });
        editorToken = jwtService.sign({ sub: editorUser.recordId });
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId });
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    afterEach(async () => {
      await orchardModel.deleteMany({});
      await clientModel.deleteMany({});
      await subsidiaryModel.deleteMany({});
    });


    describe('Action Permissions (Guard)', () => {
        let testOrchard: OrchardDocument;
        let testClient: ClientDocument;

        beforeEach(async () => {
            testClient = await new clientModel({ recordId: 'C_AUTH_O', name: 'Auth Client for Orchard' }).save();
            testOrchard = await new orchardModel({ recordId: 'O_AUTH', name: 'Auth Orchard', clientId: testClient._id }).save();
        });

        it('POST /orchards should FAIL with 403 for user without ORCHARD_CREATE', () => {
            return request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${editorToken}`)
                .send({ recordId: 'FAIL', name: 'FAIL', clientId: testClient._id.toHexString() }).expect(403);
        });
        it('GET /orchards should FAIL with 403 for user without ORCHARD_VIEW', () => {
            return request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });
        it('PATCH /orchards/:id should FAIL with 403 for user without ORCHARD_EDIT', () => {
            return request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${viewOnlyToken}`).send({ name: 'FAIL' }).expect(403);
        });
        it('DELETE /orchards/:id should FAIL with 403 for user without ORCHARD_DELETE', () => {
            return request(app.getHttpServer()).delete(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${editorToken}`).expect(403);
        });
    });

    describe('Field-Level Permissions', () => {
        it('PATCH /orchards/:id should SUCCEED when updating isActive with ORCHARD_EDIT permission', async () => {
            const client = await new clientModel({ recordId: 'CLI_FIELD_TEST', name: 'Field Test' }).save();
            const orchard = await new orchardModel({ recordId: 'ORCH_FIELD_TEST', name: 'Field Test', clientId: client._id }).save();
            
            return request(app.getHttpServer())
                .patch(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${editorToken}`) // Editor has ORCHARD_EDIT
                .send({ isActive: false })
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(false);
                });
        });
    });

    describe('Visibility Scope (Data Segregation)', () => {
        let clientUserToken: string;
        let consultantUserToken: string;

        beforeEach(async () => {
            // Clean up test-specific users and roles to avoid conflicts
            await roleModel.deleteMany({ recordId: { $in: ['ROLE_CLIENT_E2E_O', 'ROLE_SUB_E2E_O'] } });
            await userModel.deleteMany({ recordId: { $in: ['CLIENT_USER_O', 'CONSULTANT_USER_O'] } });

            const subsidiaryA = await new subsidiaryModel({ recordId: 'SUB_A_O', name: 'Subsidiary A' }).save();
            const subsidiaryB = await new subsidiaryModel({ recordId: 'SUB_B_O', name: 'Subsidiary B' }).save();
            const clientA1 = await new clientModel({ recordId: 'CLI_A1_O', name: 'Client A1', subsidiaryId: subsidiaryA._id }).save();
            const clientA2 = await new clientModel({ recordId: 'CLI_A2_O', name: 'Client A2', subsidiaryId: subsidiaryA._id }).save();
            const clientB1 = await new clientModel({ recordId: 'CLI_B1_O', name: 'Client B1', subsidiaryId: subsidiaryB._id }).save();

            // Seed orchards for these clients
            await new orchardModel({ recordId: 'ORCH_A1', name: 'Orchard A1', clientId: clientA1._id }).save();
            await new orchardModel({ recordId: 'ORCH_A2', name: 'Orchard A2', clientId: clientA2 }).save();
            await new orchardModel({ recordId: 'ORCH_B1', name: 'Orchard B1', clientId: clientB1 }).save();

            const clientRole = await new roleModel({ recordId: 'ROLE_CLIENT_E2E_O', name: 'Client Role', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();
            const subsidiaryRole = await new roleModel({ recordId: 'ROLE_SUB_E2E_O', name: 'Subsidiary Role', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY }).save();
            
            const clientUser = await new userModel({ recordId: 'CLIENT_USER_O', name: 'Client Scope User', firstName: 'Client', lastName: 'User', userType: UserType.CONTACT, roleId: clientRole._id, clientIds: [clientA1._id] }).save();
            const consultantUser = await new userModel({ recordId: 'CONSULTANT_USER_O', name: 'Sub Scope User', firstName: 'Sub', lastName: 'User', userType: UserType.EMPLOYEE, roleId: subsidiaryRole._id, clientIds: [clientA1._id] }).save();
            
            clientUserToken = jwtService.sign({ sub: clientUser.recordId });
            consultantUserToken = jwtService.sign({ sub: consultantUser.recordId });
        });

        it('should SUCCEED and return ALL orchards for a user with Global scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(response.body).toHaveLength(3);
        });

        it('should SUCCEED and return ONLY assigned orchards for a user with Client scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${clientUserToken}`).expect(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].recordId).toBe('ORCH_A1');
        });

        it('should SUCCEED and return all orchards from the assigned subsidiary for a user with Subsidiary scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${consultantUserToken}`).expect(200);
            expect(response.body).toHaveLength(2); // Should see ORCH_A1 and ORCH_A2
        });
    });

    describe('Query Filter Permissions', () => {
        it('should FAIL with 403 when a user without VIEW_DELETED permission queries for deleted records', async () => {
            const client = await new clientModel({ recordId: 'C_DEL_FILTER', name: 'Client for Deleted Filter' }).save();
            await new orchardModel({ recordId: 'ORCH_DELETED_AUTH', name: 'Deleted For Auth', clientId: client._id, isDeleted: true, isActive: false }).save();
            
            return request(app.getHttpServer())
                .get('/orchards?isDeleted=true')
                .set('Authorization', `Bearer ${editorToken}`) // Editor does not have VIEW_DELETED
                .expect(403);
        });

        it('should SUCCEED when a user with VIEW_DELETED permission queries for deleted records', async () => {
            const client = await new clientModel({ recordId: 'C_DEL_FILTER_2', name: 'Client for Deleted Filter 2' }).save();
            await new orchardModel({ recordId: 'ORCH_DELETED_AUTH_2', name: 'Deleted For Auth 2', clientId: client._id, isDeleted: true, isActive: false }).save();
            
            return request(app.getHttpServer())
                .get('/orchards?isDeleted=true')
                .set('Authorization', `Bearer ${adminToken}`) // Admin has all perms
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThan(0);
                    expect(res.body[0].isDeleted).toBe(true);
                });
        });
    });

    describe('Visibility Scope on Mutations and Nested Routes', () => {
        let clientA: ClientDocument, clientB: ClientDocument, orchardB: OrchardDocument, scopedToken: string;

        beforeEach(async () => {
            await roleModel.deleteMany({ recordId: 'ROLE_SCOPED_TEST_O' });
            await userModel.deleteMany({ recordId: 'USER_SCOPED_TEST_O' });

            clientA = await new clientModel({ recordId: 'CLI_AUTH_A_O', name: 'Auth Client A' }).save();
            clientB = await new clientModel({ recordId: 'CLI_AUTH_B_O', name: 'Auth Client B' }).save();
            orchardB = await new orchardModel({ recordId: 'ORCH_AUTH_B', name: 'Auth Orchard B', clientId: clientB._id }).save();

            const scopedRole = await new roleModel({ recordId: 'ROLE_SCOPED_TEST_O', name: 'Scoped Role', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT], visibilityScope: VisibilityScope.CLIENT }).save();
            const scopedUser = await new userModel({ recordId: 'USER_SCOPED_TEST_O', name: 'Scoped User', firstName: 'Scoped', lastName: 'User', userType: UserType.CONTACT, roleId: scopedRole._id, clientIds: [clientA._id] }).save();
            scopedToken = jwtService.sign({ sub: scopedUser.recordId });
        });

        it('PATCH /orchards/:id should FAIL with 404 for an orchard outside the user scope', () => {
            return request(app.getHttpServer())
                .patch(`/orchards/${orchardB._id}`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .send({ name: 'This should not work' })
                .expect(404);
        });

        it('GET /clients/:clientId/orchards should FAIL with 404 for a parent client outside the user scope', () => {
            return request(app.getHttpServer())
                .get(`/clients/${clientB._id}/orchards`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .expect(404);
        });
    });
});