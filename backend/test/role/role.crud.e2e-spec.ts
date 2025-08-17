import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Test Data
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Create a single admin role/user with all permissions for these tests
        const adminPerms = [PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_EDIT, PERMISSIONS.ROLE_DELETE];
        const adminRole = await new roleModel({ recordId: 'ROLE_CRUD_ADMIN', name: 'Role CRUD Admin', permissions: adminPerms, visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_ROLE_CRUD_ADMIN', name: 'Role CRUD Admin', firstName: 'Role', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    beforeEach(async () => { await roleModel.deleteMany({ recordId: { $ne: 'ROLE_CRUD_ADMIN' } }); });

    describe('POST /roles', () => {
        it('should SUCCEED with 201 when creating a role with valid data', () => {
            const createDto = { name: 'Valid Role', visibilityScope: VisibilityScope.CLIENT, permissions: ['Test:Perm'] };
            return request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${adminToken}`).send(createDto).expect(201)
                .then(res => {
                    expect(res.body.name).toEqual('Valid Role');
                    expect(res.body.recordId).toMatch(/^ROL\d{4,}$/);
                });
        });

        it('should FAIL with 400 for missing required fields', () => {
            const incompleteDto = { name: 'Incomplete Role' };
            return request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${adminToken}`).send(incompleteDto).expect(400);
        });

        it('should FAIL with 400 for a non-whitelisted field', () => {
            const extraFieldDto = { name: 'Extra', visibilityScope: VisibilityScope.GLOBAL, unexpected: 'value' };
            return request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${adminToken}`).send(extraFieldDto).expect(400);
        });
    });

    describe('GET /roles/:roleId', () => {
        it('should SUCCEED with 200 for an existing role', async () => {
            const role = await new roleModel({ recordId: 'ROLE_FIND_ME', name: 'Find Me Role', visibilityScope: VisibilityScope.CLIENT }).save();
            return request(app.getHttpServer()).get(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
        });

        it('should FAIL with 404 for a non-existent role', () => {
            return request(app.getHttpServer()).get(`/roles/${new Types.ObjectId()}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });

    describe('PATCH /roles/:roleId', () => {
        it('should SUCCEED with 200 when updating a role', async () => {
            const role = await new roleModel({ recordId: 'ROLE_TO_UPDATE', name: 'Original', visibilityScope: VisibilityScope.CLIENT }).save();
            return request(app.getHttpServer()).patch(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Updated' }).expect(200)
                .then(res => { expect(res.body.name).toEqual('Updated'); });
        });
    });

    describe('DELETE /roles/:roleId', () => {
        it('should SUCCEED with 200 and soft-delete the role', async () => {
            const role = await new roleModel({ recordId: 'ROLE_TO_DELETE', name: 'To Be Deleted', visibilityScope: VisibilityScope.CLIENT }).save();
            await request(app.getHttpServer()).delete(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            await request(app.getHttpServer()).get(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });
});