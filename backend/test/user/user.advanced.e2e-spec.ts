// backend/test/user/user.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';

describe('Users Advanced Logic - Integrity & Constraints (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;

    // Tokens
    let adminToken: string;

    // Entities
    let adminRole: RoleDocument;
    let testClient: ClientDocument;
    let testUser: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));

        // 1. Setup Admin
        adminRole = await roleModel.create({ 
            recordId: 'ADM_ADV', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL 
        });
        const adminUser = await userModel.create({
            recordId: 'ADM_USR_ADV', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@adv.com', userType: UserType.EMPLOYEE, roleId: adminRole._id
        });
        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // 2. Setup Client
        testClient = await clientModel.create({ recordId: 'CLI_ADV', name: 'Advanced Client', isActive: true });

        // 3. Setup Test User
        testUser = await userModel.create({
            recordId: 'USR_ADV', name: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@adv.com', userType: UserType.EMPLOYEE, roleId: adminRole._id, clientIds: [testClient._id]
        });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    describe('Integrity Rule: Immutability (Layer 3)', () => {
        it('should NOT allow changing the userType', async () => {
            // Attempt to change userType from EMPLOYEE to CONTACT
            // Expect 200 OK but field ignored (as it's not in UpdateUserDto whitelist)
            
            await request(app.getHttpServer())
                .patch(`/users/${testUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    userType: UserType.CONTACT,
                    __v: testUser.__v
                })
                .expect(200);

            const refreshed = await userModel.findById(testUser._id);
            expect(refreshed!.userType).toBe(UserType.EMPLOYEE);
        });
    });

    describe('Constraint: Parent/Child Dependencies', () => {
        // Create isolated entities for this test block
        let depRole: RoleDocument;
        let depClient: ClientDocument;
        let depUser: UserDocument;

        beforeEach(async () => {
             depRole = await roleModel.create({ recordId: 'ROLE_DEP', name: 'Dependency Role', permissions: [], visibilityScope: VisibilityScope.CLIENT });
             depClient = await clientModel.create({ recordId: 'CLI_DEP', name: 'Dependency Client', isActive: true });
             depUser = await userModel.create({
                 recordId: 'USR_DEP', name: 'Dependency User', firstName: 'Dep', lastName: 'User', email: 'dep@test.com', 
                 userType: UserType.CONTACT, roleId: depRole._id, clientIds: [depClient._id], isActive: true
             });
        });

        afterEach(async () => {
            await userModel.deleteMany({ recordId: 'USR_DEP' });
            await roleModel.deleteMany({ recordId: 'ROLE_DEP' });
            await clientModel.deleteMany({ recordId: 'CLI_DEP' });
        });

        // 1. Role cannot be deleted if it has active Users
        it('should PREVENT deleting a Role if it has active Users', async () => {
            // Attempt Delete Role -> Expect 409 Conflict
            const res = await request(app.getHttpServer())
                .delete(`/roles/${depRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(409);
            
            expect(res.body.message).toMatch(/cannot delete role.*assigned to one or more users/i);
        });

        // 2. Client cannot be deactivated if it has active Users
        it('should PREVENT deactivating a Client if it has active Users', async () => {
            // Attempt Deactivate Client -> Expect 409 Conflict
            const res = await request(app.getHttpServer())
                .patch(`/clients/${depClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    isActive: false,
                    __v: depClient.__v
                })
                .expect(409);
            
            expect(res.body.message).toMatch(/cannot be deactivated.*active user\(s\)/i);
        });

        it('should ALLOW deleting a Role once Users are re-assigned or deleted', async () => {
            // 1. Soft Delete the User first
            await userModel.updateOne({ _id: depUser._id }, { isDeleted: true, isActive: false });

            // 2. Now Delete Role -> Expect 200 OK
            await request(app.getHttpServer())
                .delete(`/roles/${depRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            const deletedRole = await roleModel.findById(depRole._id);
            expect(deletedRole!.isDeleted).toBe(true);
        });

        it('should ALLOW deactivating a Client once Users are inactive', async () => {
            // 1. Soft Delete the User first
            await userModel.updateOne({ _id: depUser._id }, { isDeleted: true, isActive: false });
            
            // Attempt Deactivate Client -> Expect 200 OK
            await request(app.getHttpServer())
                .patch(`/clients/${depClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    isActive: false,
                    __v: depClient.__v
                })
                .expect(200);
            
            const inactiveClient = await clientModel.findById(depClient._id);
            expect(inactiveClient!.isActive).toBe(false);
        });
    });
});
