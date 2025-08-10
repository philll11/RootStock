import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/auth/auth.module';

import { ClientsModule } from '../src/clients/clients.module';
import { Client, ClientDocument } from '../src/clients/schemas/client.schema';
import { CreateClientDto } from '../src/clients/dto/create-client.dto';

import { UsersModule } from '../src/users/users.module';
import { User, UserDocument, UserType } from '../src/users/schemas/user.schema';

import { SubsidiariesModule } from '../src/subsidiaries/subsidiaries.module';
import { Subsidiary, SubsidiaryDocument } from '../src/subsidiaries/schemas/subsidiary.schema';

import { RolesModule } from '../src/roles/roles.module';
import { Role, RoleDocument, VisibilityScope } from '../src/roles/schemas/role.schema';

describe('ClientsController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let jwtService: JwtService;
    let validSubsidiaryId: string;
    let createdClientId: string;

    let globalUserToken: string;
    let nonAdminUserToken: string;
    let clientUserToken: string;
    let consultantUserToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: './test/.env.test',
                }),
                MongooseModule.forRoot(uri),
                AuthModule,
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({
                        secret: configService.get<string>('COGNITO_CLIENT_SECRET', 'test-secret-for-e2e'),
                        signOptions: { expiresIn: '1h' },
                    }),
                    inject: [ConfigService],
                }),
                DatabaseModule,
                ClientsModule,
                SubsidiariesModule,
                UsersModule,
                RolesModule
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
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

        await clientModel.syncIndexes();
        await subsidiaryModel.syncIndexes();
        await userModel.syncIndexes();
        await roleModel.syncIndexes();

        const globalAdminRole = await new roleModel({ recordId: 'ROLE_ADMIN_E2E', name: 'Administrator', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();
        const globalUser = await new userModel({ recordId: 'GLOBAL_USER', name: 'Global User', firstName: 'Global', lastName: 'User', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id }).save();
        globalUserToken = jwtService.sign({ sub: globalUser.recordId });

        const nonAdminRole = await new roleModel({ recordId: 'ROLE_NON_ADMIN_E2E', name: 'Non-Admin', permissions: [], visibilityScope: VisibilityScope.CLIENT }).save();
        const nonAdminUser = await new userModel({ recordId: 'NON_ADMIN_USER', name: 'Non-Admin User', firstName: 'Non-Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: nonAdminRole._id }).save();
        nonAdminUserToken = jwtService.sign({ sub: nonAdminUser.recordId });
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});

        const preservedRecordIds = ['GLOBAL_USER', 'NON_ADMIN_USER'];
        await userModel.deleteMany({ recordId: { $nin: preservedRecordIds } });
        const preservedRoleIds = ['ROLE_ADMIN_E2E', 'ROLE_NON_ADMIN_E2E'];
        await roleModel.deleteMany({ recordId: { $nin: preservedRoleIds } });

        const subsidiary = await new subsidiaryModel({ recordId: 'SUB_E2E_VALID', name: 'Valid Test Subsidiary' }).save();
        validSubsidiaryId = subsidiary._id.toString();
    });

    describe('POST /clients', () => {

        // Test Case: Creating a new client with valid data.
        it('should SUCCEED 201 Created when creating a new client successfully', async () => {
            const createClientDto: CreateClientDto = { recordId: 'CLI_E2E_CLI001', name: 'E2E Test Client', subsidiaryId: null as any };
            const response = await request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .send(createClientDto)
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toEqual(createClientDto.name);
            createdClientId = response.body._id;
        });

        // Test Case: Attempting to create a client with missing required fields.
        it('should FAIL with 400 Bad Request if required fields are missing', () => {
            const incompleteDto = { name: 'Incomplete Client' };
            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .send(incompleteDto)
                .expect(400);
        });
    });

    describe('POST /clients (Subsidiary Validation)', () => {
        it('should SUCCEED with 201 Created when creating a client successfully with a VALID subsidiaryId', () => {
            const createDto: CreateClientDto = {
                recordId: 'CLI_VALID_SUB',
                name: 'Client with Valid Sub',
                subsidiaryId: validSubsidiaryId,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .send(createDto)
                .expect(201)
                .then(response => {
                    expect(response.body.subsidiaryId).toEqual(validSubsidiaryId);
                });
        });

        it('should SUCCEED with 201 Created when creating a client successfully with a NULL subsidiaryId', () => {
            const createDto = {
                recordId: 'CLI_NULL_SUB',
                name: 'Client with Null Sub',
                subsidiaryId: null,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .send(createDto)
                .expect(201)
                .then(response => {
                    expect(response.body.subsidiaryId).toBeNull();
                });
        });

        it('should FAIL with 400 Bad Request if subsidiaryId does NOT exist', () => {
            const nonExistentMongoId = '60f8f1b3b5f9f1b3b5f9f1b4';
            const createDto: CreateClientDto = {
                recordId: 'CLI_INVALID_SUB',
                name: 'Client with Invalid Sub',
                subsidiaryId: nonExistentMongoId,
            };

            return request(app.getHttpServer())
                .post('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
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
        it('should SUCCEED with 200 Created when finding a specific client by its ID', () => {
            return request(app.getHttpServer())
                .get(`/clients/${createdClientId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200)
                .then((response) => {
                    expect(response.body._id).toEqual(createdClientId);
                    expect(response.body.name).toEqual('Find Me Client');
                });
        });

        // Test Case: Attempting to find a client with a non-existent ID.
        it('should FAIL with 404 Not Found when querying for a non-existent client ID', () => {
            const fakeId = '63b4c5d6e7f8a9b0c1d2e3f5';
            return request(app.getHttpServer())
                .get(`/clients/${fakeId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(404);
        });

        // Test Case: Getting the default list of all active, non-deleted clients.
        it('should SUCCEED with 200 Created when finding all active, non-deleted clients by default', () => {
            return request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
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
        it('should SUCCEED 200 Created when returning soft-deleted records (Admin)', async () => {
            const client = await new clientModel({ recordId: 'UCLI_E2E_CLI003', name: 'Deleted Client' }).save();
            await request(app.getHttpServer()).delete(`/clients/${client._id}`).set('Authorization', `Bearer ${globalUserToken}`);

            const response = await request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toEqual('Deleted Client');
        });

        it('should FAIL with 403 Forbidden when a non-admin queries for deleted records', () => {
            return request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                .set('Authorization', `Bearer ${nonAdminUserToken}`)
                .expect(403);
        });

        // Test Case: Verifying the 'includeInactives' filter works correctly.
        it('should SUCCEED with 200 Created and return both active and inactive records when includeInactives=true is queried', async () => {
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
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200);

            expect(response.body.length).toBe(2);
        });
    });

    describe('GET /clients (Visibility Scope)', () => {
        beforeEach(async () => {
            const subsidiaryA = await new subsidiaryModel({ recordId: 'SUB_A', name: 'Subsidiary A' }).save();
            const subsidiaryB = await new subsidiaryModel({ recordId: 'SUB_B', name: 'Subsidiary B' }).save();

            const clientA1 = await new clientModel({ recordId: 'CLI_A1', name: 'Client A1', subsidiaryId: subsidiaryA._id }).save();

            await new clientModel({ recordId: 'CLI_A2', name: 'Client A2', subsidiaryId: subsidiaryA._id }).save();
            await new clientModel({ recordId: 'CLI_B1', name: 'Client B1', subsidiaryId: subsidiaryB._id }).save();

            const clientRole = await new roleModel({ recordId: 'ROLE_CLIENT_E2E', name: 'Client Role', permissions: [], visibilityScope: VisibilityScope.CLIENT }).save();
            const subsidiaryRole = await new roleModel({ recordId: 'ROLE_SUBSIDIARY_E2E', name: 'Subsidiary Role', permissions: [], visibilityScope: VisibilityScope.SUBSIDIARY }).save();

            const clientUser = await new userModel({
                recordId: 'CLIENT_USER',
                name: 'Client User',
                firstName: 'Client',
                lastName: 'User',
                userType: UserType.EMPLOYEE,
                roleId: clientRole._id,
                clientIds: [clientA1._id]
            }).save();
            const consultantUser = await new userModel({
                recordId: 'CONSULTANT_USER',
                name: 'Consultant User',
                firstName: 'Consultant',
                lastName: 'User',
                userType: UserType.EMPLOYEE,
                roleId: subsidiaryRole._id,
                clientIds: [clientA1._id]
            }).save();

            clientUserToken = jwtService.sign({ sub: clientUser.recordId });
            consultantUserToken = jwtService.sign({ sub: consultantUser.recordId });
        });

        it('should SUCCEED and return ALL clients for a user with Global scope', async () => {
            const response = await request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200);

            expect(response.body).toHaveLength(3);
            const names = response.body.map(c => c.name);
            expect(names).toEqual(expect.arrayContaining(['Client A1', 'Client A2', 'Client B1']));
        });

        it('should SUCCEED and return ONLY the assigned client for a user with Client scope', async () => {
            const response = await request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${clientUserToken}`)
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('Client A1');
        });

        it('should SUCCEED and return all clients from the assigned subsidiary for a user with Subsidiary scope', async () => {
            const response = await request(app.getHttpServer())
                .get('/clients')
                .set('Authorization', `Bearer ${consultantUserToken}`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            const names = response.body.map(c => c.name);
            expect(names).toEqual(expect.arrayContaining(['Client A1', 'Client A2']));
            expect(names).not.toContain('Client B1');
        });
    });

    describe('GET /clients/:clientId/users', () => {
        let activeClientId: string;
        let inactiveClientId: string;

        beforeEach(async () => {
            const activeClient = await new clientModel({ recordId: 'ACTIVE_CLI', name: 'Active Client' }).save();
            activeClientId = activeClient._id.toString();
            await new userModel({ recordId: 'U1', name: 'User of Active', firstName: 'U', lastName: '1', userType: UserType.EMPLOYEE, clientIds: [activeClientId], roleId: '60f8f1b3b5f9f1b3b5f9f1b4' }).save();
            const inactiveClient = await new clientModel({ recordId: 'INACTIVE_CLI', name: 'Inactive Client', isActive: false }).save();
            inactiveClientId = inactiveClient._id.toString();
            await new userModel({ recordId: 'U2', name: 'User of Inactive', firstName: 'U', lastName: '2', userType: UserType.EMPLOYEE, clientIds: [inactiveClientId], roleId: '60f8f1b3b5f9f1b3b5f9f1b4' }).save();
        });

        it('should SUCCEED with 200 OK when requesting users for an ACTIVE client', () => {
            return request(app.getHttpServer())
                .get(`/clients/${activeClientId}/users`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBe(1);
                    expect(res.body[0].name).toBe('User of Active');
                });
        });

        it('should FAIL with 404 Not Found when requesting users for an INACTIVE client', () => {
            return request(app.getHttpServer())
                .get(`/clients/${inactiveClientId}/users`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(404);
        });

        it('should SUCCEED with 200 OK and return an empty array for an active client with no users', async () => {
            const clientWithNoUsers = await new clientModel({ recordId: 'NO_USERS_CLI', name: 'Client With No Users' }).save();

            return request(app.getHttpServer())
                .get(`/clients/${clientWithNoUsers._id}/users`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBe(0);
                });
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
        it('should SUCCEED with 200 Created when updating a client successfully', () => {
            const updateDto = { name: 'Updated E2E Client' };
            return request(app.getHttpServer())
                .patch(`/clients/${createdClientId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .send(updateDto)
                .expect(200)
                .then((response) => {
                    expect(response.body.name).toEqual('Updated E2E Client');
                });
        });
    });


    describe('DELETE /clients/:clientId', () => {
        beforeEach(async () => {
            const client = await new clientModel({ recordId: 'CLI-TO-DELETE', name: 'Delete Me' }).save();
            createdClientId = client._id.toString();
        });

        it('should SUCCEED with 200 Created and then FAIL with a 404 Not Found when soft-deleting a client', async () => {
            await request(app.getHttpServer())
                .delete(`/clients/${createdClientId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200)
                .then(response => {
                    expect(response.body.isDeleted).toBe(true);
                    expect(response.body.isActive).toBe(false);
                });

            // Verify it cannot be fetched via findOne anymore
            await request(app.getHttpServer())
                .get(`/clients/${createdClientId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(404);
        });

        it('should SUCCEED with 200 Created when atomically disassociate all linked users when a client is deleted', async () => {
            const otherClient = await new clientModel({ recordId: 'OTHER-CLI', name: 'Other Client' }).save();
            // User 1: Linked to the client-to-be-deleted AND another client
            const user1 = await new userModel({ recordId: 'U1', firstName: 'User', lastName: 'One', name: 'User One', userType: UserType.EMPLOYEE, clientIds: [createdClientId, otherClient._id] }).save();
            // User 2: Linked ONLY to the client-to-be-deleted
            const user2 = await new userModel({ recordId: 'U2', firstName: 'User', lastName: 'Two', name: 'User Two', userType: UserType.EMPLOYEE, clientIds: [createdClientId] }).save();

            await request(app.getHttpServer())
                .delete(`/clients/${createdClientId}`)
                .set('Authorization', `Bearer ${globalUserToken}`)
                .expect(200);

            const updatedUser1 = await userModel.findById(user1._id);
            const updatedUser2 = await userModel.findById(user2._id);

            // User 1 should now only be linked to the "other" client
            expect(updatedUser1!.clientIds.map(id => id.toString())).toEqual([otherClient._id.toString()]);
            // User 2 should now be linked to no clients
            expect(updatedUser2!.clientIds).toEqual([]);
        });
    });

});