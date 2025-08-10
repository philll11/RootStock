import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { RolesGuard } from '../src/common/guards/roles.guard';

import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { RolesModule } from '../src/roles/roles.module';
import { ClientsModule } from '../src/clients/clients.module';

import { User, UserDocument, UserType } from '../src/users/schemas/user.schema';
import { Role, VisibilityScope, RoleDocument } from '../src/roles/schemas/role.schema';
import { CreateRoleDto } from '../src/roles/dto/create-role.dto';

describe('RolesController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let jwtService: JwtService;
    let createdRoleId: string;

    // Add tokens for our test users
    let globalUserToken: string;
    let nonAdminUserToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
                MongooseModule.forRoot(uri),
                DatabaseModule, AuthModule, UsersModule, RolesModule, ClientsModule,
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({
                        secret: configService.get<string>('COGNITO_CLIENT_SECRET'),
                    }),
                    inject: [ConfigService],
                }),
            ],
            providers: [RolesGuard, Reflector]
        }).compile();

        app = moduleFixture.createNestApplication();
        useContainer(moduleFixture, { fallbackOnErrors: true });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

        // --- Create global users for all tests ---
        const adminRole = await new roleModel({ recordId: 'ROLE_ADMIN_E2E', name: 'Administrator', visibilityScope: VisibilityScope.GLOBAL }).save();
        const globalUser = await new userModel({ recordId: 'GLOBAL_USER', name: 'Global User', firstName: 'Global', lastName: 'User', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        globalUserToken = jwtService.sign({ sub: globalUser.recordId });

        const growerRole = await new roleModel({ recordId: 'ROLE_GROWER_E2E', name: 'Grower', visibilityScope: VisibilityScope.CLIENT }).save();
        const nonAdminUser = await new userModel({ recordId: 'NON_ADMIN_USER', name: 'Non-Admin User', firstName: 'Non-Admin', lastName: 'User', userType: UserType.EMPLOYEE, roleId: growerRole._id }).save();
        nonAdminUserToken = jwtService.sign({ sub: nonAdminUser.recordId });
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        const preservedRoleIds = ['ROLE_ADMIN_E2E', 'ROLE_GROWER_E2E'];
        await roleModel.deleteMany({ recordId: { $nin: preservedRoleIds } });
        const preservedUserIds = ['GLOBAL_USER', 'NON_ADMIN_USER'];
        await userModel.deleteMany({ recordId: { $nin: preservedUserIds } });
    });

    describe('POST /roles', () => {
        it('should SUCCEED with 201 Created for an Admin', async () => {
            const createDto: CreateRoleDto = { recordId: 'ROL_E2E_001', name: 'Test Role', visibilityScope: VisibilityScope.CLIENT };
            await request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${globalUserToken}`).send(createDto).expect(201);
        });

        it('should FAIL with 403 Forbidden for a non-Admin', async () => {
            const createDto: CreateRoleDto = { recordId: 'ROL_E2E_001', name: 'Test Role', visibilityScope: VisibilityScope.CLIENT };
            await request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${nonAdminUserToken}`).send(createDto).expect(403);
        });
    });


    describe('GET /roles (Visibility & Access)', () => {
        let testRoleId: string;
        beforeEach(async () => {
            const role = await new roleModel({ recordId: 'ROL_E2E_FIND', name: 'Find Me Role', visibilityScope: VisibilityScope.SUBSIDIARY }).save();
            testRoleId = role._id.toString();
        });

        it('should SUCCEED for an Admin to get all roles', async () => {
            const response = await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${globalUserToken}`).expect(200);
            // We expect to see the 2 global roles + the 1 test role
            expect(response.body.length).toBe(3);
        });

        it('should FAIL with 403 Forbidden for a non-Admin to get all roles', async () => {
            await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${nonAdminUserToken}`).expect(403);
        });

        it('should SUCCEED for an Admin to get a single role by ID', async () => {
            await request(app.getHttpServer()).get(`/roles/${testRoleId}`).set('Authorization', `Bearer ${globalUserToken}`).expect(200);
        });

        it('should FAIL with 403 Forbidden for a non-Admin to get a single role by ID', async () => {
            await request(app.getHttpServer()).get(`/roles/${testRoleId}`).set('Authorization', `Bearer ${nonAdminUserToken}`).expect(403);
        });
    });


    describe('GET /roles/:roleId/users', () => {
        it('should SUCCEED with 200 OK for an ACTIVE role', async () => {
            const role = await new roleModel({ recordId: 'ACTIVE_ROLE', name: 'Active', visibilityScope: VisibilityScope.CLIENT }).save();
            await new userModel({ recordId: 'U1', name: 'User 1', firstName: 'U', lastName: '1', userType: UserType.EMPLOYEE, roleId: role._id }).save();
            await request(app.getHttpServer()).get(`/roles/${role._id}/users`).set('Authorization', `Bearer ${globalUserToken}`).expect(200);
        });
    });

    describe('PATCH /roles/:roleId', () => {
        it('should SUCCEED with 200 OK when updating a role', async () => {
            const role = await new roleModel({ recordId: 'ROL_PATCH', name: 'Update Me', visibilityScope: VisibilityScope.CLIENT }).save();
            await request(app.getHttpServer()).patch(`/roles/${role._id}`).set('Authorization', `Bearer ${globalUserToken}`).send({ name: 'Updated Name' }).expect(200);
        });
    });

    describe('DELETE /roles/:roleId', () => {
        it('should SUCCEED with 200 OK when soft-deleting a role', async () => {
            const role = await new roleModel({ recordId: 'ROL_DELETE', name: 'Delete Me', visibilityScope: VisibilityScope.CLIENT }).save();
            await request(app.getHttpServer()).delete(`/roles/${role._id}`).set('Authorization', `Bearer ${globalUserToken}`).expect(200);
        });
    });
});