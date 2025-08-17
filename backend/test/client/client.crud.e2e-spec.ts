import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { CreateClientDto } from '../../src/clients/dto/create-client.dto';
import { UpdateClientDto } from '../../src/clients/dto/update-client.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Clients CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string; // A token with all necessary CRUD permissions
    let validSubsidiaryId: string;
    let inactiveSubsidiaryId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create a single admin role/user with all permissions for these tests
        const adminRole = await new roleModel({
            recordId: 'ROLE_CRUD_ADMIN',
            name: 'CRUD Admin',
            permissions: [PERMISSIONS.CLIENT_CREATE, PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_DELETE],
            visibilityScope: VisibilityScope.GLOBAL,
        }).save();
        const adminUser = await new userModel({
            recordId: 'USER_CRUD_ADMIN',
            name: 'CRUD Admin User',
            firstName: 'CRUD', lastName: 'Admin',
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id
        }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});
        await userModel.deleteMany({ recordId: { $ne: 'USER_CRUD_ADMIN' } });

        const validSubsidiary = await new subsidiaryModel({ recordId: 'SUB_VALID', name: 'Valid Subsidiary' }).save();
        validSubsidiaryId = validSubsidiary._id.toString();

        const inactiveSubsidiary = await new subsidiaryModel({ recordId: 'SUB_INACTIVE', name: 'Inactive Subsidiary', isActive: false }).save();
        inactiveSubsidiaryId = inactiveSubsidiary._id.toString();
    });

    describe('POST /clients', () => {
        it('should SUCCEED with 201 when creating a client with valid data', () => {
            const createClientDto: CreateClientDto = { name: 'Valid Client', subsidiaryId: validSubsidiaryId };
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createClientDto)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toEqual('Valid Client');
                    expect(res.body.subsidiaryId).toEqual(validSubsidiaryId);
                    expect(res.body.recordId).toMatch(/^CLI\d{4,}$/);
                });
        });

        it('should SUCCEED with 201 when creating a client with a null subsidiaryId', () => {
            const createClientDto: CreateClientDto = { name: 'Client Without Subsidiary', subsidiaryId: null as any};
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createClientDto)
                .expect(201)
                .then(res => {
                    expect(res.body.subsidiaryId).toBeNull();
                    expect(res.body.recordId).toMatch(/^CLI\d{4,}$/);
                });
        });

        it('should FAIL with 400 for missing required fields', () => {
            const incompleteDto = { name: 'Client Missing RecordId' }; // Missing recordId
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(incompleteDto)
                .expect(400);
        });
    });

    describe('POST /clients (Relational Validation)', () => {
        it('should FAIL with 400 if subsidiaryId does not exist', () => {
            const nonExistentMongoId = new Types.ObjectId().toHexString();
            const createDto: CreateClientDto = { name: 'Client With Invalid Sub', subsidiaryId: nonExistentMongoId };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toContain(`Subsidiary with ID "${nonExistentMongoId}" does not exist, is inactive, or has been deleted.`);
                });
        });

        it('should FAIL with 400 if subsidiaryId points to an INACTIVE subsidiary', () => {
            const createDto: CreateClientDto = { name: 'Client With Inactive Sub', subsidiaryId: inactiveSubsidiaryId };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toContain(`Subsidiary with ID "${inactiveSubsidiaryId}" does not exist, is inactive, or has been deleted.`);
                });
        });
    });

    describe('GET /clients/:clientId', () => {
        it('should SUCCEED with 200 when finding a specific client by its ID', async () => {
            const client = await new clientModel({ recordId: 'CLI_FIND_ME', name: 'Find Me Client', subsidiaryId: new Types.ObjectId(validSubsidiaryId) }).save();
            return request(app.getHttpServer())
                .get(`/clients/${client._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body._id).toEqual(client._id.toString());
                });
        });

        it('should FAIL with 404 for a non-existent client ID', () => {
            const fakeId = new Types.ObjectId().toHexString();
            return request(app.getHttpServer())
                .get(`/clients/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /clients/:clientId', () => {
        let testClient: ClientDocument;
        beforeEach(async () => {
            testClient = await new clientModel({ recordId: 'CLI_TO_UPDATE', name: 'Original Name', subsidiaryId: new Types.ObjectId(validSubsidiaryId) }).save();
        });

        it('should SUCCEED with 200 when updating a client with valid data', () => {
            const updateDto: UpdateClientDto = { name: 'Updated Name' };
            return request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.name).toEqual('Updated Name');
                    expect(res.body.recordId).toEqual('CLI_TO_UPDATE');
                });
        });

        it('should FAIL with 400 when trying to update with an inactive subsidiaryId', () => {
            const updateDto: UpdateClientDto = { subsidiaryId: inactiveSubsidiaryId };
            return request(app.getHttpServer())
                .patch(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });
    });

    describe('DELETE /clients/:clientId', () => {
        let testClient: ClientDocument;
        beforeEach(async () => {
            testClient = await new clientModel({ recordId: 'CLI_TO_DELETE', name: 'To Be Deleted', subsidiaryId: new Types.ObjectId(validSubsidiaryId) }).save();
        });

        it('should SUCCEED with 200 and soft-delete the client', async () => {
            await request(app.getHttpServer())
                .delete(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });

            await request(app.getHttpServer())
                .get(`/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });
});