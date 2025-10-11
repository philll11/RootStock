import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { CreateSubsidiaryDto } from '../../src/subsidiaries/dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';

describe('Subsidiaries CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let clientModel: Model<ClientDocument>;

    // Tokens
    let globalAdminToken: string;

    // Test Data Entities
    let testSubsidiary: SubsidiaryDocument;
    let inactiveSubsidiary: SubsidiaryDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        
        const adminRole = await roleModel.create({
            recordId: 'ROLE_ADMIN_SUB_CRUD',
            name: 'Admin',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL,
        });

        const globalAdmin = await userModel.create({
            recordId: 'ADMIN_SUB_CRUD',
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin_crud_subsidiary@test.com',
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id,
        });
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });

        [testSubsidiary, inactiveSubsidiary] = await subsidiaryModel.create([
            { recordId: 'SUB_CRUD_A', name: 'CRUD Test Subsidiary A' },
            { recordId: 'SUB_CRUD_B', name: 'CRUD Test Subsidiary B', isActive: false },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    beforeEach(async () => {
        // Clean collections but preserve the foundational data from beforeAll
        await subsidiaryModel.deleteMany({ recordId: { $nin: ['SUB_CRUD_A', 'SUB_CRUD_B'] } });
        await clientModel.deleteMany({});
    });

    describe('POST /subsidiaries', () => {
        it('should create a subsidiary with a sequential recordId', async () => {
            const createDto: CreateSubsidiaryDto = { name: 'New Test Subsidiary' };
            const res = await request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(201);

            expect(res.body.name).toBe(createDto.name);
            expect(res.body.recordId).toMatch(/^SUB\d{4}$/);
            expect(res.body.isActive).toBe(true);
        });

        it('should reject creation if required field (name) is missing', async () => {
            await request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${globalAdminToken}`).send({}).expect(400);
        });

        it('should reject creation with extra non-whitelisted fields', async () => {
            const invalidDto = { name: 'Invalid DTO', extraField: 'should fail' };
            await request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${globalAdminToken}`).send(invalidDto).expect(400);
        });
    });
    
    describe('GET /subsidiaries', () => {
        it('should retrieve a list of active subsidiaries by default', async () => {
            const res = await request(app.getHttpServer()).get('/subsidiaries').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe(testSubsidiary.recordId);
        });

        it('should retrieve a single subsidiary by ID', async () => {
            const res = await request(app.getHttpServer()).get(`/subsidiaries/${testSubsidiary._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body.recordId).toBe(testSubsidiary.recordId);
        });

        it('should return 404 for a non-existent subsidiary ID', async () => {
            await request(app.getHttpServer()).get(`/subsidiaries/${new Types.ObjectId().toHexString()}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(404);
        });

        it('should return 404 for an inactive subsidiary by default', async () => {
            await request(app.getHttpServer()).get(`/subsidiaries/${inactiveSubsidiary._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(404);
        });
    });

    describe('PATCH /subsidiaries/:id', () => {
        it('should successfully update a subsidiary`s name', async () => {
            const updateDto: UpdateSubsidiaryDto = { name: 'Updated Name' };
            const res = await request(app.getHttpServer()).patch(`/subsidiaries/${testSubsidiary._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(200);
            expect(res.body.name).toBe(updateDto.name);
        });

        it('should prevent deactivation if active clients exist', async () => {
            await clientModel.create({ recordId: 'CLI_BLOCKER', name: 'Blocking Client', subsidiaryId: testSubsidiary._id });
            const updateDto: UpdateSubsidiaryDto = { isActive: false };
            await request(app.getHttpServer()).patch(`/subsidiaries/${testSubsidiary._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(409);
        });
    });
    
    describe('DELETE /subsidiaries/:id', () => {
        it('should soft-delete a subsidiary and then return 404 on GET', async () => {
            const deleteRes = await request(app.getHttpServer())
                .delete(`/subsidiaries/${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(deleteRes.body.isDeleted).toBe(true);
            expect(deleteRes.body.isActive).toBe(false);

            await request(app.getHttpServer())
                .get(`/subsidiaries/${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });
});