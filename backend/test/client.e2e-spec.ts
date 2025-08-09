import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { ClientsModule } from '../src/clients/clients.module';
import { Client, ClientDocument } from '../src/clients/entities/client.schema';
import { CreateClientDto } from '../src/clients/dto/create-client.dto';

import { SubsidiariesModule } from '../src/subsidiaries/subsidiaries.module';
import { Subsidiary, SubsidiaryDocument } from '../src/subsidiaries/entities/subsidiary.schema';

describe('ClientsController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryServer;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let validSubsidiaryId: string;
    let createdClientId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(uri),
                ClientsModule,
                SubsidiariesModule
            ],
        }).compile();

        app = moduleFixture.createNestApplication();

        useContainer(moduleFixture, { fallbackOnErrors: true });

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        await app.init();

        clientModel = moduleFixture.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        await clientModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});

        const subsidiary = await new subsidiaryModel({
            recordId: 'SUB_E2E_VALID',
            name: 'Valid Test Subsidiary'
        }).save();
        validSubsidiaryId = subsidiary._id.toString();
    });

    describe('POST /clients', () => {
        // Test Case: Creating a new client with valid data.
        it('should create a new client successfully', async () => {
            const createClientDto: CreateClientDto = {
                recordId: 'CLI_E2E_CLI001',
                name: 'E2E Test Client',
                subsidiaryId: null as any
            };

            const response = await request(app.getHttpServer())
                .post('/clients')
                .send(createClientDto)
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toEqual(createClientDto.name);
            createdClientId = response.body._id;
        });

        // Test Case: Attempting to create a client with missing required fields.
        it('should fail with a 400 Bad Request if required fields are missing', () => {
            const incompleteDto = { name: 'Incomplete Client' };
            return request(app.getHttpServer())
                .post('/clients')
                .send(incompleteDto)
                .expect(400);
        });
    });

    describe('POST /clients (Subsidiary Validation)', () => {
        it('should create a client successfully with a VALID subsidiaryId', () => {
            const createDto: CreateClientDto = {
                recordId: 'CLI_VALID_SUB',
                name: 'Client with Valid Sub',
                subsidiaryId: validSubsidiaryId,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .send(createDto)
                .expect(201)
                .then(response => {
                    expect(response.body.subsidiaryId).toEqual(validSubsidiaryId);
                });
        });

        it('should create a client successfully with a NULL subsidiaryId', () => {
            const createDto = {
                recordId: 'CLI_NULL_SUB',
                name: 'Client with Null Sub',
                subsidiaryId: null,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .send(createDto)
                .expect(201)
                .then(response => {
                    expect(response.body.subsidiaryId).toBeNull();
                });
        });

        it('should FAIL with a 400 Bad Request if subsidiaryId does NOT exist', () => {
            const nonExistentMongoId = '60f8f1b3b5f9f1b3b5f9f1b4';
            const createDto: CreateClientDto = {
                recordId: 'CLI_INVALID_SUB',
                name: 'Client with Invalid Sub',
                subsidiaryId: nonExistentMongoId,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .send(createDto)
                .expect(400)
                .then(response => {
                    expect(response.body.message).toContain(`Subsidiary with ID "${nonExistentMongoId}" does not exist, is inactive, or has been deleted.`);
                });
        });
    });


    describe('GET /clients', () => {
        beforeEach(async () => {
            const client: ClientDocument = await new clientModel({
                recordId: 'CLI_E2E_CLI002',
                name: 'Find Me Client',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
            }).save();
            createdClientId = client._id.toString();
        });

        // Test Case: Finding a single client by its unique ID.
        it('should find a specific client by its ID', () => {
            return request(app.getHttpServer())
                .get(`/clients/${createdClientId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body._id).toEqual(createdClientId);
                    expect(response.body.name).toEqual('Find Me Client');
                });
        });

        // Test Case: Attempting to find a client with a non-existent ID.
        it('should return a 404 Not Found for a non-existent client ID', () => {
            const fakeId = '63b4c5d6e7f8a9b0c1d2e3f5';
            return request(app.getHttpServer())
                .get(`/clients/${fakeId}`)
                .expect(404);
        });

        // Test Case: Getting the default list of all active, non-deleted clients.
        it('should find all active, non-deleted clients by default', () => {
            return request(app.getHttpServer())
                .get('/clients')
                .expect(200)
                .then((response) => {
                    expect(Array.isArray(response.body)).toBe(true);
                    expect(response.body.length).toBe(1);
                    expect(response.body[0].name).toEqual('Find Me Client');
                });
        });
    });

    describe('GET /clients (Advanced Queries)', () => {
        // Test Case: Verifying an admin can retrieve soft-deleted records.
        it('should return soft-deleted records when isDeleted=true is queried (Admin)', async () => {
            const client: ClientDocument = await new clientModel({
                recordId: 'UCLI_E2E_CLI003',
                name: 'Deleted Client',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
            }).save();
            await request(app.getHttpServer()).delete(`/clients/${client._id}`);

            // Note: This relies on the RolesGuard mock being an 'Administrator'.
            const response = await request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toEqual('Deleted Client');
        });

        // Test Case: Verifying a regular user CANNOT retrieve soft-deleted records.
        // NOTE: This test will fail until we can change the mock user in RolesGuard.
        // We will write it now to be ready for our full auth implementation.
        it.skip('should return a 403 Forbidden when a non-admin queries for deleted records', () => {
            // This test is skipped because we cannot currently change the mock user in the guard.
            // In a real implementation, we would set a header with a non-admin JWT.
            return request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                // We would set a non-admin token here: .set('Authorization', 'Bearer non-admin-token')
                .expect(403);
        });

        // Test Case: Verifying the 'includeInactives' filter works correctly.
        it('should return both active and inactive records when includeInactives=true is queried', async () => {
            await new clientModel({
                recordId: 'CLI_E2E_CLI004',
                name: 'Active Client',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
            }).save();
            await new clientModel({
                recordId: 'CLI_E2E_CLI005',
                name: 'Inactive Client',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
                isActive: false,
            }).save();


            const response = await request(app.getHttpServer())
                .get('/clients?includeInactives=true')
                .expect(200);

            expect(response.body.length).toBe(2);
        });
    });

    describe('PATCH /clients/:clientId', () => {
        beforeEach(async () => {
            const client: ClientDocument = await new clientModel({
                recordId: 'CLI_E2E_CLI006',
                name: 'Update Me',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
            }).save();
            createdClientId = client._id.toString();
        });
        // Test Case: Updating a client's data.
        it('should update a client successfully', () => {
            const updateDto = { name: 'Updated E2E Client' };
            return request(app.getHttpServer())
                .patch(`/clients/${createdClientId}`)
                .send(updateDto)
                .expect(200)
                .then((response) => {
                    expect(response.body.name).toEqual('Updated E2E Client');
                });
        });
    });

    describe('DELETE /clients/:clientId', () => {
        beforeEach(async () => {
            const client: ClientDocument = await new clientModel({
                recordId: 'CLI_E2E_CLI007',
                name: 'Delete Me',
                subsidiaryId: '63b4c5d6e7f8a9b0c1d2e3f4',
            }).save();
            createdClientId = client._id.toString();
        });
        // Test Case: Soft-deleting a client.
        it('should soft-delete a client successfully', () => {
            return request(app.getHttpServer())
                .delete(`/clients/${createdClientId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body.isDeleted).toBe(true);
                    expect(response.body.isActive).toBe(false);
                });
        });
    });
});