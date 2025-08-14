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
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Users Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Test Data
    let adminToken: string, consultantToken: string, growerToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /users (Visibility Scope)', () => {
        beforeEach(async () => {
            await userModel.deleteMany({});
            await roleModel.deleteMany({});
            await clientModel.deleteMany({});
            await subsidiaryModel.deleteMany({});

            const adminRole = await new roleModel({ recordId: 'ROLE_ADMIN', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
            const consultantRole = await new roleModel({ recordId: 'ROLE_CONSULTANT', name: 'Consultant', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY }).save();
            const growerRole = await new roleModel({ recordId: 'ROLE_GROWER', name: 'Grower', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();

            const sub1 = await new subsidiaryModel({ recordId: 'SUB_1', name: 'Subsidiary 1' }).save();
            const client1_sub1 = await new clientModel({ recordId: 'C1_S1', name: 'Client 1 of Sub 1', subsidiaryId: sub1._id }).save();
            const client2_sub1 = await new clientModel({ recordId: 'C2_S1', name: 'Client 2 of Sub 1', subsidiaryId: sub1._id }).save();
            const sub2 = await new subsidiaryModel({ recordId: 'SUB_2', name: 'Subsidiary 2' }).save();
            const client3_sub2 = await new clientModel({ recordId: 'C3_S2', name: 'Client 3 of Sub 2', subsidiaryId: sub2._id }).save();

            await new userModel({ recordId: 'USER_FOR_C1', name: 'User for C1', firstName: 'U', lastName: 'C1', userType: UserType.EMPLOYEE, roleId: growerRole._id, clientIds: [client1_sub1._id] }).save();
            await new userModel({ recordId: 'USER_FOR_C2', name: 'User for C2', firstName: 'U', lastName: 'C2', userType: UserType.EMPLOYEE, roleId: growerRole._id, clientIds: [client2_sub1._id] }).save();
            await new userModel({ recordId: 'USER_FOR_C3', name: 'User for C3', firstName: 'U', lastName: 'C3', userType: UserType.EMPLOYEE, roleId: growerRole._id, clientIds: [client3_sub2._id] }).save();

            const adminUser = await new userModel({ recordId: 'USER_ADMIN', name: 'Admin User', firstName: 'Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
            adminToken = jwtService.sign({ sub: adminUser.recordId });
            const consultantUser = await new userModel({ recordId: 'USER_CONSULTANT', name: 'Consultant User', firstName: 'Consultant', lastName: 'User', userType: UserType.EMPLOYEE, roleId: consultantRole._id, clientIds: [client1_sub1._id] }).save();
            consultantToken = jwtService.sign({ sub: consultantUser.recordId });
            const growerUser = await new userModel({ recordId: 'USER_GROWER', name: 'Grower User', firstName: 'Grower', lastName: 'User', userType: UserType.EMPLOYEE, roleId: growerRole._id, clientIds: [client1_sub1._id] }).save();
            growerToken = jwtService.sign({ sub: growerUser.recordId });
        });

        it('should return ALL users for a Global Admin', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(res.body).toHaveLength(6);
        });

        it('should return ONLY users from the same subsidiary for a Consultant', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${consultantToken}`).expect(200);
            expect(res.body).toHaveLength(4);
            const names = res.body.map(u => u.name);
            expect(names).toEqual(expect.arrayContaining(['Consultant User', 'Grower User', 'User for C1', 'User for C2']));
        });

        it('should return ONLY users from their own client for a Grower', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${growerToken}`).expect(200);
            expect(res.body).toHaveLength(3);
            const names = res.body.map(u => u.name);
            expect(names).toEqual(expect.arrayContaining(['Consultant User', 'Grower User', 'User for C1']));
        });
    });

    describe('Action Permissions', () => {
        let adminUserForTest: UserDocument;
        let growerTokenForTest: string;

        beforeAll(async () => {
            const adminUser = await userModel.findOne({ recordId: 'USER_ADMIN' }).exec();
            const growerUser = await userModel.findOne({ recordId: 'USER_GROWER' }).exec();

            expect(adminUser).not.toBeNull();
            expect(growerUser).not.toBeNull();

            adminUserForTest = adminUser!;
            growerTokenForTest = jwtService.sign({ sub: growerUser!.recordId });
        });

        it('POST /users should FAIL with 403 for a non-Admin', () => {
            const dto = { recordId: 'U_FAIL', firstName: 'Fail', lastName: 'User', userType: UserType.EMPLOYEE };
            return request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${growerToken}`).send(dto).expect(403);
        });

        it('PATCH /users/:id should FAIL with 403 for a non-Admin', () => {
            return request(app.getHttpServer()).patch(`/users/${adminUserForTest._id}`).set('Authorization', `Bearer ${growerToken}`).send({ firstName: 'Updated' }).expect(403);
        });

        it('DELETE /users/:id should FAIL with 403 for a non-Admin', () => {
            return request(app.getHttpServer()).delete(`/users/${adminUserForTest._id}`).set('Authorization', `Bearer ${growerToken}`).expect(403);
        });
    });
});