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

describe('Subsidiaries Advanced Logic (e2e)', () => {
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

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models directly from the app instance
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create a global admin role and user
        const adminRole = await new roleModel({ recordId: 'ROLE_SUB_ADV_ADMIN', name: 'Sub Adv Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_SUB_ADV_ADMIN', name: 'Sub Adv Admin', firstName: 'Sub', lastName: 'Adv', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => { await app.close(); await mongod.stop(); });
    beforeEach(async () => { await subsidiaryModel.deleteMany({}); await clientModel.deleteMany({}); });

    describe('Inactivation Pre-Condition', () => {
        it('should FAIL with 409 Conflict when deactivating a subsidiary with active clients', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_W_CLIENTS', name: 'Sub with Clients' }).save();
            await new clientModel({ recordId: 'ACTIVE_CHILD', name: 'Active Child Client', subsidiaryId: sub._id }).save();
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).send({ isActive: false }).expect(409);
        });
        it('should SUCCEED when deactivating a subsidiary with only inactive clients', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_W_INACTIVE', name: 'Sub with Inactive' }).save();
            await new clientModel({ recordId: 'INACTIVE_CHILD', name: 'Inactive Child', subsidiaryId: sub._id, isActive: false }).save();
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).send({ isActive: false }).expect(200);
        });
    });

    describe('Transactional Delete', () => {
        it('should atomically disassociate all child clients when a subsidiary is deleted', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_TO_DELETE', name: 'To Be Deleted' }).save();
            await new clientModel({ recordId: 'C1', name: 'Client 1', subsidiaryId: sub._id }).save();
            await new clientModel({ recordId: 'C2', name: 'Client 2', subsidiaryId: sub._id }).save();
            await request(app.getHttpServer()).delete(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            const orphanedCount = await clientModel.countDocuments({ subsidiaryId: sub._id });
            expect(orphanedCount).toBe(0);
            const client1 = await clientModel.findOne({ recordId: 'C1' });
            expect(client1).not.toBeNull();
            expect(client1!.subsidiaryId).toBeNull();
        });
    });

    describe('Nested Routes', () => {
        it('GET /subsidiaries/:id/clients should return only clients for the specified subsidiary', async () => {
            const sub1 = await new subsidiaryModel({ recordId: 'SUB_1', name: 'Sub 1' }).save();
            const sub2 = await new subsidiaryModel({ recordId: 'SUB_2', name: 'Sub 2' }).save();
            await new clientModel({ recordId: 'C1S1', name: 'Client 1 of Sub 1', subsidiaryId: sub1._id }).save();
            const res = await request(app.getHttpServer()).get(`/subsidiaries/${sub1._id}/clients`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('C1S1');
        });
        it('GET /subsidiaries/:id/clients should FAIL with 404 for an inactive parent subsidiary', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_INACTIVE', name: 'Inactive Sub', isActive: false }).save();
            return request(app.getHttpServer()).get(`/subsidiaries/${sub._id}/clients`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });

    describe('Advanced Query Filters', () => {
        it('should return soft-deleted records when ?isDeleted=true', async () => {
            await new subsidiaryModel({ recordId: 'SUB_DELETED', name: 'Deleted Sub', isDeleted: true, isActive: false }).save();
            const res = await request(app.getHttpServer()).get('/subsidiaries?isDeleted=true').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('SUB_DELETED');
        });
    });
});