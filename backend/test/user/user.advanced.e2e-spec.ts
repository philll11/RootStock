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

import { AppModule } from '../../src/app.module';

import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';

import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Users Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let userModel: Model<UserDocument>;
    let clientModel: Model<ClientDocument>;
    let jwtService: JwtService;
    let adminToken: string;
    let validClientId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, envFilePath: './test/.env.test' }),
                MongooseModule.forRoot(uri), AppModule,
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({ secret: configService.get<string>('COGNITO_CLIENT_SECRET'), signOptions: { expiresIn: '1h' } }),
                    inject: [ConfigService],
                }),
            ],
        }).compile();
        app = moduleFixture.createNestApplication();
        useContainer(app.select(AppModule), { fallbackOnErrors: true });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
        await app.init();

        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        clientModel = moduleFixture.get<Model<ClientDocument>>(getModelToken(Client.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

        const roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        const adminRole = await new roleModel({ recordId: 'ROLE_U_ADV_ADMIN', name: 'User Adv Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_U_ADV_ADMIN', name: 'User Adv Admin', firstName: 'U', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();

        adminToken = jwtService.sign({ sub: adminUser.recordId });

        const client = await new clientModel({ recordId: 'CLIENT_ADV', name: 'Advanced Test Client' }).save();
        validClientId = client._id.toString();
    });

    afterAll(async () => { await app.close(); await mongod.stop(); });
    beforeEach(async () => { await userModel.deleteMany({ recordId: { $ne: 'USER_U_ADV_ADMIN' } }); });

    describe('Derived Fields', () => {
        it('should correctly derive and update the name field when firstName is patched', async () => {
            const user = await new userModel({ recordId: 'U_DERIVED', name: 'Original Name', firstName: 'Original', lastName: 'Name', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).patch(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).send({ firstName: 'Patched' }).expect(200)
                .then(res => { expect(res.body.name).toEqual('Patched Name'); });
        });

        it('should correctly derive and update the name field when lastName is patched', async () => {
            const user = await new userModel({ recordId: 'U_DERIVED_2', name: 'Original Name', firstName: 'Original', lastName: 'Name', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).patch(`/users/${user._id}`).set('Authorization', `Bearer ${adminToken}`).send({ lastName: 'Patched' }).expect(200)
                .then(res => { expect(res.body.name).toEqual('Original Patched'); });
        });
    });

    describe('Business Rules', () => {
        it('should FAIL with 403 when attempting to change clientIds for a CONTACT user', async () => {
            const contact = await new userModel({ recordId: 'U_CONTACT', name: 'Contact User', firstName: 'Contact', lastName: 'User', userType: UserType.CONTACT }).save();

            return request(app.getHttpServer()).patch(`/users/${contact._id}`).set('Authorization', `Bearer ${adminToken}`).send({ clientIds: [validClientId] }).expect(403);
        });
    });

    describe('Advanced Query Filters', () => {
        it('should SUCCEED returning only CONTACT users when ?userType=contact', async () => {
            await new userModel({ recordId: 'U_CONTACT_Q', name: 'Contact Q', firstName: 'C', lastName: 'Q', userType: UserType.CONTACT }).save();
            await new userModel({ recordId: 'U_EMPLOYEE_Q', name: 'Employee Q', firstName: 'E', lastName: 'Q', userType: UserType.EMPLOYEE }).save();
            return request(app.getHttpServer()).get('/users?userType=contact').set('Authorization', `Bearer ${adminToken}`).expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].recordId).toBe('U_CONTACT_Q');
                });
        });
    });
});