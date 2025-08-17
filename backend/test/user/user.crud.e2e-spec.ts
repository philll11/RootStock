import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';

import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';

describe('Users CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;

    // Test Data
    let adminToken: string;
    let validRoleId: string;
    let validClientId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));

        const adminPerms = [PERMISSIONS.USER_CREATE, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE];
        const adminRole = await new roleModel({ recordId: 'ROLE_USER_CRUD_ADMIN', name: 'User CRUD Admin', permissions: adminPerms, visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_CRUD_ADMIN', name: 'User CRUD Admin', firstName: 'User', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        await userModel.deleteMany({ recordId: { $ne: 'USER_CRUD_ADMIN' } });
        await roleModel.deleteMany({ recordId: { $ne: 'ROLE_USER_CRUD_ADMIN' } });
        await clientModel.deleteMany({});

        const role = await new roleModel({ recordId: 'ROLE_VALID', name: 'Valid Role', visibilityScope: VisibilityScope.CLIENT }).save();
        validRoleId = role._id.toString();
        const client = await new clientModel({ recordId: 'CLIENT_VALID', name: 'Valid Client' }).save();
        validClientId = client._id.toString();
    });

    describe('POST /users', () => {
        it('should SUCCEED with 201 when creating a user with valid data', () => {
            const createDto: CreateUserDto = { firstName: 'Valid', lastName: 'User', userType: UserType.EMPLOYEE };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(createDto).expect(201)
                .then(res => { 
                    expect(res.body.name).toEqual('Valid User');
                    expect(res.body.recordId).toMatch(/^USR\d{4,}$/);
                });
        });

        it('should SUCCEED with 201 when creating a valid EMPLOYEE user', () => {
            const createDto: CreateUserDto = { firstName: 'Valid', lastName: 'Employee', userType: UserType.EMPLOYEE, roleId: validRoleId, clientIds: [validClientId] };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(createDto).expect(201);
        });

        it('should SUCCEED with 201 when creating a valid CONTACT user', () => {
            const createDto: CreateUserDto = { firstName: 'Valid', lastName: 'Contact', userType: UserType.CONTACT, clientIds: [validClientId] };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(createDto).expect(201);
        });

        it('should FAIL with 400 for missing required fields', () => {
            const incompleteDto = { recordId: 'U_INCOMPLETE', firstName: 'Incomplete' };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(incompleteDto).expect(400);
        });

        it('should FAIL with 400 for a non-existent roleId', () => {
            const dto = { recordId: 'U_BAD_ROLE', firstName: 'Bad', lastName: 'Role', userType: UserType.EMPLOYEE, roleId: new Types.ObjectId().toHexString() };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(dto).expect(400);
        });

        it('should FAIL with 400 for a non-existent clientId in clientIds', () => {
            const dto = { recordId: 'U_BAD_CLIENT', firstName: 'Bad', lastName: 'Client', userType: UserType.EMPLOYEE, clientIds: [new Types.ObjectId().toHexString()] };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(dto).expect(400);
        });

        it('should FAIL with 400 when creating a CONTACT user with no clientIds', () => {
            const dto = { recordId: 'U_CONTACT_FAIL', firstName: 'Contact', lastName: 'Fail', userType: UserType.CONTACT, clientIds: [] }; // Contact needs exactly one
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(dto).expect(400);
        });

        it('should SUCCEED when creating an EMPLOYEE user with no clientIds', () => {
            const dto = { firstName: 'Emp', lastName: 'NoClients', userType: UserType.EMPLOYEE, roleId: validRoleId };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${adminToken}`).send(dto).expect(201);
        });
    });

    describe('GET /users/:userId', () => {
        it('should SUCCEED with 200 for an existing user', async () => {
            const user = await new userModel({ recordId: 'U_FIND', name: 'Find Me', firstName: 'Find', lastName: 'Me', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).get(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
        });

        it('should FAIL with 404 for a non-existent user', () => {
            return request(app.getHttpServer()).get(`/users/${new Types.ObjectId()}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });

    describe('DELETE /users/:userId', () => {
        it('should SUCCEED with 200 and soft-delete the user', async () => {
            const user = await new userModel({ recordId: 'U_DELETE', name: 'To Delete', firstName: 'To', lastName: 'Delete', userType: UserType.EMPLOYEE }).save();
            await request(app.getHttpServer()).delete(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            await request(app.getHttpServer()).get(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });
});