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

import { AppModule } from '../../src/app.module';
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
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let jwtService: JwtService;

    let adminToken: string; // A token with all necessary CRUD permissions
    let validSubsidiaryId: string;
    let inactiveSubsidiaryId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, envFilePath: './test/.env.test' }),
                MongooseModule.forRoot(uri),
                AppModule,
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({
                        secret: configService.get<string>('COGNITO_CLIENT_SECRET'),
                        signOptions: { expiresIn: '1h' },
                    }),
                    inject: [ConfigService],
                }),
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        useContainer(app.select(AppModule), { fallbackOnErrors: true });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        // Get Models
        clientModel = moduleFixture.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

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
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});

        const validSubsidiary = await new subsidiaryModel({ recordId: 'SUB_VALID', name: 'Valid Subsidiary' }).save();
        validSubsidiaryId = validSubsidiary._id.toString();

        const inactiveSubsidiary = await new subsidiaryModel({ recordId: 'SUB_INACTIVE', name: 'Inactive Subsidiary', isActive: false }).save();
        inactiveSubsidiaryId = inactiveSubsidiary._id.toString();
    });

    describe('POST /clients', () => {
        it('should SUCCEED with 201 when creating a client with valid data', () => {
            const createClientDto: CreateClientDto = { recordId: 'CLI_VALID', name: 'Valid Client', subsidiaryId: validSubsidiaryId };
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createClientDto)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toEqual('Valid Client');
                    expect(res.body.subsidiaryId).toEqual(validSubsidiaryId);
                });
        });

        it('should SUCCEED with 201 when creating a client with a null subsidiaryId', () => {
            const createClientDto: CreateClientDto = { recordId: 'CLI_NO_SUB', name: 'Client Without Subsidiary', subsidiaryId: null as any};
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createClientDto)
                .expect(201)
                .then(res => {
                    expect(res.body.subsidiaryId).toBeNull();
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

        it('should FAIL with 409 Conflict for a duplicate recordId', async () => {
            const createClientDto: CreateClientDto = { recordId: 'CLI_DUPLICATE', name: 'First Client', subsidiaryId: validSubsidiaryId };
            await new clientModel(createClientDto).save();

            const duplicateClientDto: CreateClientDto = { recordId: 'CLI_DUPLICATE', name: 'Second Client With Same RecordId', subsidiaryId: validSubsidiaryId };
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(duplicateClientDto)
                .expect(409) // Expect Conflict
                .then(res => {
                    expect(res.body.message).toContain(`The value 'CLI_DUPLICATE' for field 'recordId' already exists.`);
                });
        });
    });

    describe('POST /clients (Relational Validation)', () => {
        it('should FAIL with 400 if subsidiaryId does not exist', () => {
            const nonExistentMongoId = new Types.ObjectId().toHexString();
            const createDto: CreateClientDto = { recordId: 'CLI_INVALID_SUB', name: 'Client With Invalid Sub', subsidiaryId: nonExistentMongoId };

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
            const createDto: CreateClientDto = { recordId: 'CLI_INACTIVE_SUB', name: 'Client With Inactive Sub', subsidiaryId: inactiveSubsidiaryId };

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
            const client = await new clientModel({ recordId: 'CLI_FIND_ME', name: 'Find Me Client' }).save();
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
            testClient = await new clientModel({ recordId: 'CLI_TO_UPDATE', name: 'Original Name' }).save();
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
            testClient = await new clientModel({ recordId: 'CLI_TO_DELETE', name: 'To Be Deleted' }).save();
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