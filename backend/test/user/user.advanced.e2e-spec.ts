import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Users Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let clientModel: Model<ClientDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string;
    let validClientId: string;

    jest.setTimeout(120000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        const adminRole = await new roleModel({ recordId: 'ROLE_U_ADV_ADMIN', name: 'User Adv Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_U_ADV_ADMIN', name: 'User Adv Admin', firstName: 'U', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();

        adminToken = jwtService.sign({ sub: adminUser.recordId });

        const client = await new clientModel({ recordId: 'CLIENT_ADV', name: 'Advanced Test Client' }).save();
        validClientId = client._id.toString();
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    beforeEach(async () => { await userModel.deleteMany({ recordId: { $ne: 'USER_U_ADV_ADMIN' } }); });

    describe('Derived Fields', () => {
        it('should correctly derive and update the name field when firstName is patched', async () => {
            const user = await new userModel({ recordId: 'U_DERIVED', name: 'Original Name', firstName: 'Original', lastName: 'Name', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).patch(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).send({ firstName: 'Patched' }).expect(200)
                .then(res => { expect(res.body.name).toEqual('Patched Name'); });
        });

        it('should correctly derive and update the name field when lastName is patched', async () => {
            const user = await new userModel({ recordId: 'U_DERIVED_2', name: 'Original Name', firstName: 'Original', lastName: 'Name', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).patch(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).send({ lastName: 'Patched' }).expect(200)
                .then(res => { expect(res.body.name).toEqual('Original Patched'); });
        });
    });

    describe('Business Rules', () => {
        it('should FAIL with 403 when attempting to change clientIds for a CONTACT user', async () => {
            const contact = await new userModel({ recordId: 'U_CONTACT', name: 'Contact User', firstName: 'Contact', lastName: 'User', userType: UserType.CONTACT }).save();

            return request(app.getHttpServer()).patch(`/users/${contact._id}`).set('Authorization', `Bearer ${adminToken}`).send({ clientIds: [validClientId] }).expect(403);
        });
    });

    describe('Advanced Query Filters', () => {
        it('should SUCCEED returning only CONTACT users when ?userType=contact', async () => {
            await new userModel({ recordId: 'U_CONTACT_Q', name: 'Contact Q', firstName: 'C', lastName: 'Q', userType: UserType.CONTACT }).save();
            await new userModel({ recordId: 'U_EMPLOYEE_Q', name: 'Employee Q', firstName: 'E', lastName: 'Q', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).get('/users?userType=contact').set('Authorization', `Bearer ${adminToken}`).expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].recordId).toBe('U_CONTACT_Q');
                });
        });
    });
});