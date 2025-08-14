import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { useContainer } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { AppModule } from '../../src/app.module';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string;
    let editorToken: string;
    let viewOnlyToken: string
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create a set of roles and users with varying permissions
        const adminRole = await new roleModel({ recordId: 'ROLE_ADMIN_SUB_AUTH', name: 'Sub Auth Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const editorRole = await new roleModel({ recordId: 'ROLE_EDITOR_SUB_AUTH', name: 'Sub Auth Editor', permissions: [PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewOnlyRole = await new roleModel({ recordId: 'ROLE_VIEWER_SUB_AUTH', name: 'Sub Auth Viewer', permissions: [PERMISSIONS.SUBSIDIARY_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsRole = await new roleModel({ recordId: 'ROLE_NO_PERMS_SUB_AUTH', name: 'Sub Auth No Perms', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();

        const adminUser = await new userModel({ recordId: 'USER_ADMIN_SUB_AUTH', name: 'Admin User', firstName: 'Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
        const editorUser = await new userModel({ recordId: 'USER_EDITOR_SUB_AUTH', name: 'Editor User', firstName: 'Editor', lastName: 'User', userType: UserType.EMPLOYEE, roleId: editorRole._id }).save();
        editorToken = jwtService.sign({ sub: editorUser.recordId });
        const viewOnlyUser = await new userModel({ recordId: 'USER_VIEWER_SUB_AUTH', name: 'View Only User', firstName: 'Viewer', lastName: 'User', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id }).save();
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId });
        const noPermsUser = await new userModel({ recordId: 'USER_NO_PERMS_SUB_AUTH', name: 'No Perms User', firstName: 'No', lastName: 'Perms', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    beforeEach(async () => { await subsidiaryModel.deleteMany({}); await clientModel.deleteMany({}); });

    describe('Action Permissions', () => {
        it('POST should FAIL with 403 for user without SUBSIDIARY_CREATE permission', () => {
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${viewOnlyToken}`).send({ recordId: 'FAIL', name: 'FAIL' }).expect(403);
        });
        it('PATCH should FAIL with 403 for user without SUBSIDIARY_EDIT permission', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_PATCH_FAIL', name: 'Patch Fail' }).save();
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${viewOnlyToken}`).send({ name: 'FAIL' }).expect(403);
        });
    });

    describe('Field-Level Permissions', () => {
        it('PATCH should FAIL with 403 when updating isActive without SUBSIDIARY_EDIT_STATUS permission', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_STATUS_FAIL', name: 'Status Fail' }).save();
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${editorToken}`).send({ isActive: false }).expect(403);
        });
    });

    describe('Visibility Scope', () => {
        let subA: SubsidiaryDocument, subB: SubsidiaryDocument, clientUserToken: string, unaffiliatedUserToken: string;

        beforeEach(async () => {
            await userModel.deleteMany({ recordId: { $in: ['USER_VIS_CLIENT', 'USER_VIS_UNAFFILIATED'] } });
            await roleModel.deleteMany({ recordId: 'ROLE_VIS_CLIENT' });

            subA = await new subsidiaryModel({ recordId: 'SUB_A', name: 'Subsidiary A' }).save();
            subB = await new subsidiaryModel({ recordId: 'SUB_B', name: 'Subsidiary B' }).save();
            const clientA = await new clientModel({ recordId: 'CLI_A', name: 'Client of Sub A', subsidiaryId: subA._id }).save();
            const clientRole = await new roleModel({ recordId: 'ROLE_VIS_CLIENT', name: 'Vis Client Role', permissions: [PERMISSIONS.SUBSIDIARY_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();
            const clientUser = await new userModel({ recordId: 'USER_VIS_CLIENT', name: 'Vis Client User', firstName: 'Vis', lastName: 'Client', userType: UserType.CONTACT, roleId: clientRole._id, clientIds: [clientA._id] }).save();
            clientUserToken = jwtService.sign({ sub: clientUser.recordId });
            const unaffiliatedUser = await new userModel({ recordId: 'USER_VIS_UNAFFILIATED', name: 'Unaffiliated User', firstName: 'Unaffiliated', lastName: 'User', userType: UserType.CONTACT, roleId: clientRole._id, clientIds: [] }).save();
            unaffiliatedUserToken = jwtService.sign({ sub: unaffiliatedUser.recordId });
        });

        it('should return ALL subsidiaries for a user with Global scope', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(res.body).toHaveLength(2);
        });

        it('should return ONLY the parent subsidiary for a user with Client scope', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries').set('Authorization', `Bearer ${clientUserToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Subsidiary A');
        });

        it('should return an empty array for a Client-scoped user with no assigned clients', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries').set('Authorization', `Bearer ${unaffiliatedUserToken}`).expect(200);
            expect(res.body).toHaveLength(0);
        });

        it('should FAIL with 404 when a Client-scoped user tries to GET a subsidiary outside their scope by ID', async () => {
            return request(app.getHttpServer()).get(`/subsidiaries/${subB._id}`).set('Authorization', `Bearer ${clientUserToken}`).expect(404);
        });
    });
});