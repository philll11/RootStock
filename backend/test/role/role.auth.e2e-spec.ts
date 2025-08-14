import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { CreateRoleDto } from '../../src/roles/dto/create-role.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Test Data
    let adminToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Create a set of roles and users with varying permissions
        const adminRole = await new roleModel({ recordId: 'ROLE_AUTH_ADMIN', name: 'Role Auth Admin', permissions: [PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewRole = await new roleModel({ recordId: 'ROLE_AUTH_VIEWER', name: 'Role Auth Viewer', permissions: [PERMISSIONS.ROLE_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsRole = await new roleModel({ recordId: 'ROLE_AUTH_NONE', name: 'Role Auth None', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();

        const adminUser = await new userModel({ recordId: 'USER_ROLE_AUTH_ADMIN', name: 'Role Auth Admin', firstName: 'R', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
        const viewUser = await new userModel({ recordId: 'USER_ROLE_AUTH_VIEWER', name: 'Role Auth Viewer', firstName: 'R', lastName: 'Viewer', userType: UserType.EMPLOYEE, roleId: viewRole._id }).save();
        viewOnlyToken = jwtService.sign({ sub: viewUser.recordId });
        const noPermsUser = await new userModel({ recordId: 'USER_ROLE_AUTH_NONE', name: 'Role Auth None', firstName: 'R', lastName: 'None', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => { await roleModel.deleteMany({ recordId: { $nin: ['ROLE_AUTH_ADMIN', 'ROLE_AUTH_VIEWER', 'ROLE_AUTH_NONE'] } }); });

    describe('Action Permissions', () => {
        let testRole: RoleDocument;
        beforeEach(async () => {
            testRole = await new roleModel({ recordId: 'ROLE_AUTH_TEST', name: 'Auth Test Role', visibilityScope: VisibilityScope.CLIENT }).save();
        });

        it('GET /roles should SUCCEED for a user with ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${viewOnlyToken}`).expect(200)
                .then(res => {
                    expect(res.body.length).toBe(4);
                });
        });

        it('POST /roles should FAIL with 403 for user without ROLE_CREATE permission', () => {
            const createDto: CreateRoleDto = { recordId: 'FAIL', name: 'Fail Role', visibilityScope: VisibilityScope.CLIENT };
            return request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${viewOnlyToken}`).send(createDto).expect(403);
        });

        it('GET /roles should FAIL with 403 for user without ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });

        it('GET /roles/:id should FAIL with 403 for user without ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get(`/roles/${testRole._id}`).set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });
    });
});