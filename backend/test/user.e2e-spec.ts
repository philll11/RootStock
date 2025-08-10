import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DatabaseModule } from '../src/database/database.module';

import { RolesGuard } from '../src/common/guards/roles.guard';

import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { ClientsModule } from '../src/clients/clients.module';
import { RolesModule } from '../src/roles/roles.module';
import { SubsidiariesModule } from '../src/subsidiaries/subsidiaries.module';

import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { User, UserDocument, UserType } from '../src/users/schemas/user.schema';
import { Client, ClientDocument } from '../src/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../src/roles/schemas/role.schema';
import { Subsidiary, SubsidiaryDocument } from '../src/subsidiaries/schemas/subsidiary.schema';

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let jwtService: JwtService;

    // --- Test Data Placeholders ---
    let globalAdminToken: string;
    let consultantToken: string;
    let growerToken: string;
    let testAdminRoleId: string;
    let testGrowerRoleId: string;
    let validClientId1: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
                MongooseModule.forRoot(uri),
                DatabaseModule, AuthModule, UsersModule, ClientsModule, RolesModule, SubsidiariesModule,
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({ secret: configService.get<string>('COGNITO_CLIENT_SECRET') }),
                    inject: [ConfigService],
                }),
            ],
            providers: [RolesGuard],
        }).compile();

        app = moduleFixture.createNestApplication();
        useContainer(moduleFixture, { fallbackOnErrors: true });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = moduleFixture.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        // Clear all collections before each test to ensure a clean slate
        await userModel.deleteMany({});
        await roleModel.deleteMany({});
        await clientModel.deleteMany({});
        await subsidiaryModel.deleteMany({});

        // --- Create a standard set of roles and a client for tests ---
        const adminRole = await new roleModel({ recordId: 'ROLE_ADMIN', name: 'Administrator', visibilityScope: VisibilityScope.GLOBAL }).save();
        const consultantRole = await new roleModel({ recordId: 'ROLE_CONSULTANT', name: 'Consultant', visibilityScope: VisibilityScope.SUBSIDIARY }).save();
        const growerRole = await new roleModel({ recordId: 'ROLE_GROWER', name: 'Grower', visibilityScope: VisibilityScope.CLIENT }).save();
        testAdminRoleId = adminRole._id.toString();
        testGrowerRoleId = growerRole._id.toString();

        const client1 = await new clientModel({ recordId: 'CLIENT_1', name: 'Test Client 1' }).save();
        validClientId1 = client1._id.toString();

        // --- Create our standard test users and their tokens ---
        const adminUser = await new userModel({ recordId: 'USER_ADMIN', name: 'Admin User', firstName: 'Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId });

        const consultantUser = await new userModel({ recordId: 'USER_CONSULTANT', name: 'Consultant User', firstName: 'Consultant', lastName: 'User', userType: UserType.EMPLOYEE, roleId: consultantRole._id, clientIds: [validClientId1] }).save();
        consultantToken = jwtService.sign({ sub: consultantUser.recordId });

        const growerUser = await new userModel({ recordId: 'USER_GROWER', name: 'Grower User', firstName: 'Grower', lastName: 'User', userType: UserType.EMPLOYEE, roleId: growerRole._id, clientIds: [validClientId1] }).save();
        growerToken = jwtService.sign({ sub: growerUser.recordId });
    });

    describe('POST /users', () => {
        it('should SUCCEED with 201 Created for an Admin', async () => {
            const dto: CreateUserDto = { recordId: 'U001', firstName: 'John', lastName: 'Doe', userType: UserType.EMPLOYEE, roleId: testAdminRoleId };
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(dto).expect(201);
        });

        it('should FAIL with 403 Forbidden for a non-Admin', async () => {
            const dto: CreateUserDto = { recordId: 'U001', firstName: 'John', lastName: 'Doe', userType: UserType.EMPLOYEE, roleId: testAdminRoleId };
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${growerToken}`).send(dto).expect(403);
        });
    });

    
    describe('GET /users (Visibility Scope)', () => {
        beforeEach(async () => {
            // --- Create a rich data set for visibility testing ---
            const sub1 = await new subsidiaryModel({ recordId: 'SUB_1', name: 'Subsidiary 1' }).save();
            const client1_sub1 = await new clientModel({ recordId: 'C1_S1', name: 'Client 1 of Sub 1', subsidiaryId: sub1._id }).save();
            const client2_sub1 = await new clientModel({ recordId: 'C2_S1', name: 'Client 2 of Sub 1', subsidiaryId: sub1._id }).save();

            const sub2 = await new subsidiaryModel({ recordId: 'SUB_2', name: 'Subsidiary 2' }).save();
            const client3_sub2 = await new clientModel({ recordId: 'C3_S2', name: 'Client 3 of Sub 2', subsidiaryId: sub2._id }).save();

            // Create a user for each client
            await new userModel({ recordId: 'USER_FOR_C1', name: 'User for C1', firstName: 'U', lastName: 'C1', userType: UserType.EMPLOYEE, roleId: testGrowerRoleId, clientIds: [client1_sub1._id] }).save();
            await new userModel({ recordId: 'USER_FOR_C2', name: 'User for C2', firstName: 'U', lastName: 'C2', userType: UserType.EMPLOYEE, roleId: testGrowerRoleId, clientIds: [client2_sub1._id] }).save();
            await new userModel({ recordId: 'USER_FOR_C3', name: 'User for C3', firstName: 'U', lastName: 'C3', userType: UserType.EMPLOYEE, roleId: testGrowerRoleId, clientIds: [client3_sub2._id] }).save();

            // Re-authenticate our consultant and grower against this new, richer data
            const consultantRole = await roleModel.findOne({ recordId: 'ROLE_CONSULTANT' }).exec();
            await userModel.updateOne({ recordId: 'USER_CONSULTANT' }, { $set: { clientIds: [client1_sub1._id], roleId: consultantRole!._id } });

            const growerRole = await roleModel.findOne({ recordId: 'ROLE_GROWER' }).exec();
            await userModel.updateOne({ recordId: 'USER_GROWER' }, { $set: { clientIds: [client1_sub1._id], roleId: growerRole!._id } });
        });

        it('should SUCCEED and return ALL users for a Global Admin', async () => {
            const response = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            // 3 test users (admin, consultant, grower) + 3 data users = 6
            expect(response.body).toHaveLength(6);
        });

        it('should SUCCEED and return ONLY users from the same subsidiary for a Consultant', async () => {
            const response = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${consultantToken}`).expect(200);
            // Consultant is assigned to C1/S1, should see users from C1 and C2.
            // Also sees self and the grower user assigned to C1.
            expect(response.body).toHaveLength(4);
            const names = response.body.map(u => u.name);
            expect(names).toEqual(expect.arrayContaining(['Consultant User', 'Grower User', 'User for C1', 'User for C2']));
            expect(names).not.toContain('User for C3');
        });

        it('should SUCCEED and return ONLY users from their own client for a Grower', async () => {
            const response = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${growerToken}`).expect(200);
            // Grower is assigned to C1, should see the other user from C1.
            // Also sees self and the consultant assigned to C1.
            expect(response.body).toHaveLength(3);
            const names = response.body.map(u => u.name);
            expect(names).toEqual(expect.arrayContaining(['Consultant User', 'Grower User', 'User for C1']));
            expect(names).not.toContain('User for C2');
            expect(names).not.toContain('User for C3');
        });
    });

    describe('PATCH /users/:userId', () => {
        it('should SUCCEED for an Admin to update a user', async () => {
            const userToUpdate = await userModel.findOne({ recordId: 'USER_GROWER' }).exec();
            await request(app.getHttpServer()).patch(`/users/${userToUpdate!._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send({ firstName: 'Updated' }).expect(200);
        });

        it('should FAIL with 403 Forbidden for a non-Admin to update a user', async () => {
            const userToUpdate = await userModel.findOne({ recordId: 'USER_ADMIN' }).exec();
            await request(app.getHttpServer()).patch(`/users/${userToUpdate!._id}`).set('Authorization', `Bearer ${growerToken}`).send({ firstName: 'Updated' }).expect(403);
        });
    });

    describe('DELETE /users/:userId', () => {
        it('should SUCCEED for an Admin to delete a user', async () => {
            const userToDelete = await userModel.findOne({ recordId: 'USER_GROWER' }).exec();
            await request(app.getHttpServer()).delete(`/users/${userToDelete!._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
        });

        it('should FAIL with 403 Forbidden for a non-Admin to delete a user', async () => {
            const userToDelete = await userModel.findOne({ recordId: 'USER_ADMIN' }).exec();
            await request(app.getHttpServer()).delete(`/users/${userToDelete!._id}`).set('Authorization', `Bearer ${growerToken}`).expect(403);
        });
    });
});