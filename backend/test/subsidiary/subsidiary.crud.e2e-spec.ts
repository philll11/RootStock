import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Seed a global admin role and user for all tests in this suite
        const adminRole = await new roleModel({ recordId: 'ROLE_SUB_CRUD_ADMIN', name: 'Subsidiary CRUD Admin', permissions: [PERMISSIONS.SUBSIDIARY_CREATE, PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT, PERMISSIONS.SUBSIDIARY_DELETE], visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_SUB_CRUD_ADMIN', name: 'Sub CRUD Admin User', firstName: 'Sub', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    beforeEach(async () => { await subsidiaryModel.deleteMany({}); });

    describe('POST /subsidiaries', () => {
        
        it('should SUCCEED with 201 and a system-generated recordId', () => {
            const createDto = { name: 'Valid Subsidiary' };
            
            return request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(201)
                .then(res => {
                    expect(res.body).toHaveProperty('recordId');
                    expect(res.body.recordId).toMatch(/^SUB\d{4,}$/); // Matches SUB0001, SUB9999, SUB10000 etc.
                    expect(res.body.name).toEqual('Valid Subsidiary');
                });
        });
        
        it('should FAIL with 400 for a non-whitelisted field', () => {
            const extraFieldDto = { name: 'Extra Field Sub', unexpected: 'value' };
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).send(extraFieldDto).expect(400);
        });
    });

    describe('GET /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 when finding a specific subsidiary by its ID', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_FIND_ME', name: 'Find Me Sub' }).save();
            return request(app.getHttpServer()).get(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
        });

        it('should FAIL with 404 for a non-existent subsidiary ID', () => {
            return request(app.getHttpServer()).get(`/subsidiaries/${new Types.ObjectId()}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });

    describe('PATCH /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 when updating a subsidiary', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_TO_UPDATE', name: 'Original Name' }).save();
            const updateDto: UpdateSubsidiaryDto = { name: 'Updated Name' };
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).send(updateDto).expect(200)
                .then(res => { expect(res.body.name).toEqual('Updated Name'); });
        });
    });

    describe('DELETE /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 and soft-delete the subsidiary', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_TO_DELETE', name: 'To Be Deleted' }).save();
            await request(app.getHttpServer()).delete(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            await request(app.getHttpServer()).get(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });
});