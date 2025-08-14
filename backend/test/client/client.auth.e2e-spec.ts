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

describe('Clients Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string;
    let editorToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());
        
        // Get Models directly from the app instance
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create roles and users for testing different permission levels
        const adminRole = await new roleModel({ recordId: 'ROLE_ADMIN', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const editorRole = await new roleModel({ recordId: 'ROLE_EDITOR', name: 'Editor', permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_EDIT], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewOnlyRole = await new roleModel({ recordId: 'ROLE_VIEWER', name: 'Viewer', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsRole = await new roleModel({ recordId: 'ROLE_NO_PERMS', name: 'No Perms', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();

        const adminUser = await new userModel({ recordId: 'USER_ADMIN', name: 'Admin User', firstName: 'Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });

        const editorUser = await new userModel({ recordId: 'USER_EDITOR', name: 'Editor User', firstName: 'Editor', lastName: 'User', userType: UserType.EMPLOYEE, roleId: editorRole._id }).save();
        editorToken = jwtService.sign({ sub: editorUser.recordId });

        const viewOnlyUser = await new userModel({ recordId: 'USER_VIEWER', name: 'View Only User', firstName: 'Viewer', lastName: 'User', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id }).save();
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId });

        const noPermsUser = await new userModel({ recordId: 'USER_NO_PERMS', name: 'No Perms User', firstName: 'No', lastName: 'Perms', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});
    });

    describe('Action Permissions (Guard)', () => {
        let testClientId: string;
        beforeEach(async () => {
            const client = await new clientModel({ recordId: 'CLI_AUTH_TEST', name: 'Auth Test Client' }).save();
            testClientId = client._id.toString();
        });

        it('POST /clients should FAIL with 403 for user without CLIENT_CREATE permission', () => {
            return request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${viewOnlyToken}`).send({ recordId: 'FAIL', name: 'FAIL' }).expect(403);
        });
        it('GET /clients should FAIL with 403 for user without CLIENT_VIEW permission', () => {
            return request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });
        it('PATCH /clients/:id should FAIL with 403 for user without CLIENT_EDIT permission', () => {
            return request(app.getHttpServer()).patch(`/clients/${testClientId}`).set('Authorization', `Bearer ${viewOnlyToken}`).send({ name: 'FAIL' }).expect(403);
        });
        it('DELETE /clients/:id should FAIL with 403 for user without CLIENT_DELETE permission', () => {
            return request(app.getHttpServer()).delete(`/clients/${testClientId}`).set('Authorization', `Bearer ${editorToken}`).expect(403);
        });
    });

    describe('Field-Level Permissions', () => {
        it('PATCH /clients/:id should FAIL with 403 when updating isActive without CLIENT_EDIT_STATUS permission', async () => {
            const client = await new clientModel({ recordId: 'CLI_FIELD_TEST', name: 'Field Test' }).save();
            return request(app.getHttpServer())
                .patch(`/clients/${client._id}`)
                .set('Authorization', `Bearer ${editorToken}`)
                .send({ isActive: false })
                .expect(403);
        });
    });

    describe('Visibility Scope (Data Segregation)', () => {
        let clientUserToken: string;
        let consultantUserToken: string;

        beforeEach(async () => {
            const visibilityTestRoleIds = ['ROLE_CLIENT_E2E', 'ROLE_SUB_E2E'];
            const visibilityTestUserIds = ['CLIENT_USER', 'CONSULTANT_USER'];
            await roleModel.deleteMany({ recordId: { $in: visibilityTestRoleIds } });
            await userModel.deleteMany({ recordId: { $in: visibilityTestUserIds } });

            const subsidiaryA = await new subsidiaryModel({ recordId: 'SUB_A', name: 'Subsidiary A' }).save();
            const subsidiaryB = await new subsidiaryModel({ recordId: 'SUB_B', name: 'Subsidiary B' }).save();
            const clientA1 = await new clientModel({ recordId: 'CLI_A1', name: 'Client A1', subsidiaryId: subsidiaryA._id }).save();
            await new clientModel({ recordId: 'CLI_A2', name: 'Client A2', subsidiaryId: subsidiaryA._id }).save();
            await new clientModel({ recordId: 'CLI_B1', name: 'Client B1', subsidiaryId: subsidiaryB._id }).save();

            const clientRole = await new roleModel({ recordId: 'ROLE_CLIENT_E2E', name: 'Client Role', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();
            const subsidiaryRole = await new roleModel({ recordId: 'ROLE_SUB_E2E', name: 'Subsidiary Role', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY }).save();

            const clientUser = await new userModel({ recordId: 'CLIENT_USER', name: 'Client User', firstName: 'Client', lastName: 'User', userType: UserType.CONTACT, roleId: clientRole._id, clientIds: [clientA1._id] }).save();
            const consultantUser = await new userModel({ recordId: 'CONSULTANT_USER', name: 'Consultant User', firstName: 'Consultant', lastName: 'User', userType: UserType.EMPLOYEE, roleId: subsidiaryRole._id, clientIds: [clientA1._id] }).save();

            clientUserToken = jwtService.sign({ sub: clientUser.recordId });
            consultantUserToken = jwtService.sign({ sub: consultantUser.recordId });
        });

        it('should SUCCEED and return ALL clients for a user with Global scope', async () => {
            const response = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(response.body).toHaveLength(3);
        });

        it('should SUCCEED and return ONLY assigned clients for a user with Client scope', async () => {
            const response = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${clientUserToken}`).expect(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('Client A1');
        });

        it('should SUCCEED and return all clients from the assigned subsidiary for a user with Subsidiary scope', async () => {
            const response = await request(app.getHttpServer()).get('/clients').set('Authorization', `Bearer ${consultantUserToken}`).expect(200);
            expect(response.body).toHaveLength(2);
        });
    });

    describe('Query Filter Permissions', () => {
        it('should FAIL with 403 when a user without VIEW_DELETED permission queries for deleted records', async () => {
            // The 'editorToken' user has CLIENT_VIEW but not VIEW_DELETED
            await new clientModel({ recordId: 'CLI_DELETED_AUTH', name: 'Deleted For Auth', isDeleted: true, isActive: false }).save();
            return request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                .set('Authorization', `Bearer ${editorToken}`)
                .expect(403);
        });
    });
    describe('Visibility Scope on Mutations and Nested Routes', () => {
        let clientA: ClientDocument, clientB: ClientDocument, scopedToken: string;

        beforeEach(async () => {
            await roleModel.deleteMany({ recordId: 'ROLE_SCOPED_TEST' });
            await userModel.deleteMany({ recordId: 'USER_SCOPED_TEST' });

            clientA = await new clientModel({ recordId: 'CLI_AUTH_A', name: 'Auth Client A' }).save();
            clientB = await new clientModel({ recordId: 'CLI_AUTH_B', name: 'Auth Client B' }).save();

            const scopedRole = await new roleModel({ recordId: 'ROLE_SCOPED_TEST', name: 'Scoped Test Role', permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_EDIT], visibilityScope: VisibilityScope.CLIENT }).save();
            const scopedUser = await new userModel({ recordId: 'USER_SCOPED_TEST', name: 'Scoped Test User', firstName: 'Scoped', lastName: 'User', userType: UserType.CONTACT, roleId: scopedRole._id, clientIds: [clientA._id] }).save();
            scopedToken = jwtService.sign({ sub: scopedUser.recordId });
        });

        it('PATCH /clients/:id should FAIL with 404 for a client outside the user scope', () => {
            return request(app.getHttpServer())
                .patch(`/clients/${clientB._id}`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .send({ name: 'This should not work' })
                .expect(404); // Not found, because from this user's perspective, it doesn't exist.
        });

        it('GET /clients/:clientId/users should FAIL with 404 for a parent client outside the user scope', () => {
            return request(app.getHttpServer())
                .get(`/clients/${clientB._id}/users`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .expect(404); // Not found, because from this user's perspective, it doesn't exist.
        });
    });
});