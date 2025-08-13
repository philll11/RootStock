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
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let jwtService: JwtService;
    let adminToken: string;

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
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);
        
        // This admin needs all role permissions to test all advanced logic paths
        const adminRole = await new roleModel({ recordId: 'ROLE_ADV_ADMIN', name: 'Role Adv Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_ROLE_ADV_ADMIN', name: 'Role Adv Admin', firstName: 'Role', lastName: 'Adv', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => { await app.close(); await mongod.stop(); });
    beforeEach(async () => {
        await roleModel.deleteMany({ recordId: { $ne: 'ROLE_ADV_ADMIN' } });
        await userModel.deleteMany({ recordId: { $ne: 'USER_ROLE_ADV_ADMIN' } });
    });

    // --- MIGRATED: Unhappy Path ---
    describe('Inactivation Pre-Condition', () => {
        it('should FAIL with 409 Conflict when deactivating a role that has active users', async () => {
            const role = await new roleModel({ recordId: 'ROLE_W_USERS', name: 'Role with Users', visibilityScope: VisibilityScope.CLIENT }).save();
            await new userModel({ recordId: 'ACTIVE_USER', name: 'Active User', firstName: 'A', lastName: 'U', userType: UserType.CONTACT, roleId: role._id }).save();
            return request(app.getHttpServer()).patch(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).send({ isActive: false }).expect(409)
                .then(res => {
                    expect(res.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it.');
                });
        });
    });

    // --- MIGRATED: Happy Path ---
    describe('Transactional Delete', () => {
        it('should atomically nullify the roleId on associated users when a role is deleted', async () => {
            const role = await new roleModel({ recordId: 'ROLE_TO_DELETE', name: 'To Be Deleted Role', visibilityScope: VisibilityScope.CLIENT }).save();
            const user = await new userModel({ recordId: 'USER_W_ROLE', name: 'User with Role', firstName: 'U', lastName: 'R', userType: UserType.CONTACT, roleId: role._id }).save();
            await request(app.getHttpServer()).delete(`/roles/${role._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            const updatedUser = await userModel.findById(user._id);
            expect(updatedUser).not.toBeNull();
            expect(updatedUser!.roleId).toBeNull();
        });
    });

    // --- MIGRATED: Happy Path ---
    describe('Nested Routes', () => {
        it('GET /roles/:roleId/users should SUCCEED for an ACTIVE role', async () => {
            const role = await new roleModel({ recordId: 'ACTIVE_ROLE', name: 'Active', visibilityScope: VisibilityScope.CLIENT }).save();
            await new userModel({ recordId: 'U1', name: 'User 1', firstName: 'U', lastName: '1', userType: UserType.EMPLOYEE, roleId: role._id }).save();
            await request(app.getHttpServer()).get(`/roles/${role._id}/users`).set('Authorization', `Bearer ${adminToken}`).expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].recordId).toBe('U1');
                });
        });
    });
});