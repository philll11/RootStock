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
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { CreateRoleDto } from '../../src/roles/dto/create-role.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let roleModel: Model<RoleDocument>;
    let jwtService: JwtService;
    
    let adminToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

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
        jwtService = moduleFixture.get<JwtService>(JwtService);
        const userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));

        const adminRole = await new roleModel({ recordId: 'ROLE_AUTH_ADMIN', name: 'Role Auth Admin', permissions: [PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewRole = await new roleModel({ recordId: 'ROLE_AUTH_VIEWER', name: 'Role Auth Viewer', permissions: [PERMISSIONS.ROLE_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsRole = await new roleModel({ recordId: 'ROLE_AUTH_NONE', name: 'Role Auth None', permissions: [], visibilityScope: VisibilityScope.GLOBAL }).save();
        
        const adminUser = await new userModel({ recordId: 'USER_ROLE_AUTH_ADMIN', name: 'Role Auth Admin', firstName: 'R', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
        const viewUser = await new userModel({ recordId: 'USER_ROLE_AUTH_VIEWER', name: 'Role Auth Viewer', firstName: 'R', lastName: 'Viewer', userType: UserType.EMPLOYEE, roleId: viewRole._id }).save();
        viewOnlyToken = jwtService.sign({ sub: viewUser.recordId });
        const noPermsUser = await new userModel({ recordId: 'USER_ROLE_AUTH_NONE', name: 'Role Auth None', firstName: 'R', lastName: 'None', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => { await app.close(); await mongod.stop(); });
    beforeEach(async () => { await roleModel.deleteMany({ recordId: { $nin: ['ROLE_AUTH_ADMIN', 'ROLE_AUTH_VIEWER', 'ROLE_AUTH_NONE'] } }); });

    describe('Action Permissions', () => {
        let testRole: RoleDocument;
        beforeEach(async () => {
            testRole = await new roleModel({ recordId: 'ROLE_AUTH_TEST', name: 'Auth Test Role', visibilityScope: VisibilityScope.CLIENT }).save();
        });

        it('GET /roles should SUCCEED for a user with ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${viewOnlyToken}`).expect(200)
                .then(res => {
                    expect(res.body.length).toBe(4);
                });
        });

        it('POST /roles should FAIL with 403 for user without ROLE_CREATE permission', () => {
            const createDto: CreateRoleDto = { recordId: 'FAIL', name: 'Fail Role', visibilityScope: VisibilityScope.CLIENT };
            return request(app.getHttpServer()).post('/roles').set('Authorization', `Bearer ${viewOnlyToken}`).send(createDto).expect(403);
        });

        it('GET /roles should FAIL with 403 for user without ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });

        it('GET /roles/:id should FAIL with 403 for user without ROLE_VIEW permission', () => {
            return request(app.getHttpServer()).get(`/roles/${testRole._id}`).set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });
    });
});