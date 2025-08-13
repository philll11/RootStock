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
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Clients Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let jwtService: JwtService;

    let adminToken: string;
    let clientUserToken: string; // A user with 'Client' scope for testing nested route security
    let clientAId: string;
    let clientBId: string;

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
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

        // Create Roles
        const adminRole = await new roleModel({ recordId: 'ROLE_ADV_ADMIN', name: 'Advanced Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const clientScopeRole = await new roleModel({ recordId: 'ROLE_ADV_CLIENT', name: 'Advanced Client', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();

        // Create Users and Tokens
        const adminUser = await new userModel({ recordId: 'USER_ADV_ADMIN', name: 'Advanced Admin User', firstName: 'Adv', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });

        // Setup for nested route security test
        const clientA = await new clientModel({ recordId: 'CLI_A', name: 'Client A' }).save();
        clientAId = clientA._id.toString();
        const clientB = await new clientModel({ recordId: 'CLI_B', name: 'Client B' }).save();
        clientBId = clientB._id.toString();

        const clientScopedUser = await new userModel({ recordId: 'USER_CLIENT_SCOPE', name: 'Client Scope User', firstName: 'Client', lastName: 'Scope', userType: UserType.CONTACT, roleId: clientScopeRole._id, clientIds: [clientAId] }).save();
        clientUserToken = jwtService.sign({ sub: clientScopedUser.recordId });
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        // We clean the user model here because some tests create users that could conflict with others
        await userModel.deleteMany({ recordId: { $nin: ['USER_ADV_ADMIN', 'USER_CLIENT_SCOPE'] } });
        await clientModel.deleteMany({ recordId: { $nin: ['CLI_A', 'CLI_B'] } });
    });

    describe('Inactivation Pre-Condition', () => {
        it('should FAIL with 409 Conflict when deactivating a client that has active users', async () => {
            const clientWithUser = await new clientModel({ recordId: 'CLI_WITH_USER', name: 'Client With User' }).save();
            await new userModel({ recordId: 'ACTIVE_USER', name: 'Active User', firstName: 'Active', lastName: 'User', userType: UserType.CONTACT, clientIds: [clientWithUser._id] }).save();

            return request(app.getHttpServer())
                .patch(`/clients/${clientWithUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This client cannot be deactivated because it has 1 active user(s) assigned to it.');
                });
        });
    });

    describe('Transactional Delete', () => {
        it('should SUCCEED and atomically disassociate linked users when a client is deleted', async () => {
            const clientToDelete = await new clientModel({ recordId: 'CLI_TO_DELETE', name: 'Client To Delete' }).save();
            const user1 = await new userModel({ recordId: 'U1', name: 'User One', firstName: 'U', lastName: '1', userType: UserType.EMPLOYEE, clientIds: [clientToDelete._id] }).save();
            const user2 = await new userModel({ recordId: 'U2', name: 'User Two', firstName: 'U', lastName: '2', userType: UserType.EMPLOYEE, clientIds: [clientToDelete._id] }).save();

            await request(app.getHttpServer())
                .delete(`/clients/${clientToDelete._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const updatedUser1 = await userModel.findById(user1._id);
            const updatedUser2 = await userModel.findById(user2._id);

            expect(updatedUser1).not.toBeNull();
            expect(updatedUser2).not.toBeNull();
            expect(updatedUser1!.clientIds).toHaveLength(0);
            expect(updatedUser2!.clientIds).toHaveLength(0);
        });
    });

    describe('Nested Route Security', () => {
        it('GET /clients/:clientId/users should FAIL with 404 for a user who cannot see the parent client', () => {
            // The user is assigned to Client A, but is trying to access users for Client B.
            // The initial findOne(clientBId, user) check should fail because Client B is out of scope.
            return request(app.getHttpServer())
                .get(`/clients/${clientBId}/users`)
                .set('Authorization', `Bearer ${clientUserToken}`)
                .expect(404);
        });

        it('GET /clients/:clientId/users should SUCCEED for a user who can see the parent client', () => {
            // The user is assigned to Client A and is trying to access users for Client A.
            return request(app.getHttpServer())
                .get(`/clients/${clientAId}/users`)
                .set('Authorization', `Bearer ${clientUserToken}`)
                .expect(200);
        });
    });

    describe('GET /clients/:clientId/users (Edge Cases)', () => {
        it('should FAIL with 404 Not Found when requesting users for an INACTIVE client', async () => {
            const inactiveClient = await new clientModel({ recordId: 'CLI_INACTIVE_EDGE', name: 'Inactive Client', isActive: false }).save();
            return request(app.getHttpServer())
                .get(`/clients/${inactiveClient._id}/users`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });

        it('should SUCCEED with 200 and return an empty array for a client with no users', async () => {
            const clientWithNoUsers = await new clientModel({ recordId: 'CLI_NO_USERS', name: 'Client With No Users' }).save();
            return request(app.getHttpServer())
                .get(`/clients/${clientWithNoUsers._id}/users`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body).toEqual([]);
                });
        });
    });

    describe('Advanced Query Filters', () => {
        it('should SUCCEED returning soft-deleted records when ?isDeleted=true', async () => {
            const deletedClient = await new clientModel({ recordId: 'CLI_DELETED', name: 'Deleted Client', isDeleted: true, isActive: false }).save();
            return request(app.getHttpServer())
                .get('/clients?isDeleted=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0]._id).toEqual(deletedClient._id.toString());
                });
        });

        it('should SUCCEED returning inactive records when ?includeInactives=true', async () => {
            await new clientModel({ recordId: 'CLI_ACTIVE', name: 'Active Client', isActive: true }).save();
            await new clientModel({ recordId: 'CLI_INACTIVE', name: 'Inactive Client', isActive: false }).save();

            return request(app.getHttpServer())
                .get('/clients?includeInactives=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    // Includes the 2 clients from this test + the 2 global ones (Client A, Client B)
                    const activeAndInactive = res.body.filter(c => ['CLI_ACTIVE', 'CLI_INACTIVE'].includes(c.recordId));
                    expect(activeAndInactive).toHaveLength(2);
                });
        });
    });
});