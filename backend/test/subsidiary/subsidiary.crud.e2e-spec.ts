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
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { CreateSubsidiaryDto } from '../../src/subsidiaries/dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let subsidiaryModel: Model<SubsidiaryDocument>;
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

        subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        jwtService = moduleFixture.get<JwtService>(JwtService);

        const roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));

        const adminRole = await new roleModel({ recordId: 'ROLE_SUB_CRUD_ADMIN', name: 'Subsidiary CRUD Admin', permissions: [PERMISSIONS.SUBSIDIARY_CREATE, PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT, PERMISSIONS.SUBSIDIARY_DELETE], visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_SUB_CRUD_ADMIN', name: 'Sub CRUD Admin User', firstName: 'Sub', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => { await app.close(); await mongod.stop(); });
    beforeEach(async () => { await subsidiaryModel.deleteMany({}); });

    describe('POST /subsidiaries', () => {
        it('should SUCCEED with 201 when creating a subsidiary with valid data', () => {
            const createDto: CreateSubsidiaryDto = { recordId: 'SUB_VALID', name: 'Valid Subsidiary' };
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).send(createDto).expect(201);
        });

        it('should FAIL with 409 Conflict for a duplicate recordId', async () => {
            await new subsidiaryModel({ recordId: 'SUB_DUPE', name: 'First Sub' }).save();
            const duplicateDto: CreateSubsidiaryDto = { recordId: 'SUB_DUPE', name: 'Second Sub' };
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).send(duplicateDto).expect(409);
        });

        it('should FAIL with 400 for missing required fields', () => {
            const incompleteDto = { name: 'Incomplete Sub' }; // Missing recordId
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).send(incompleteDto).expect(400);
        });

        it('should FAIL with 400 for a non-whitelisted field', () => {
            const extraFieldDto = { recordId: 'SUB_EXTRA', name: 'Extra Field Sub', unexpected: 'value' };
            return request(app.getHttpServer()).post('/subsidiaries').set('Authorization', `Bearer ${adminToken}`).send(extraFieldDto).expect(400);
        });
    });

    describe('GET /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 when finding a specific subsidiary by its ID', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_FIND_ME', name: 'Find Me Sub' }).save();
            return request(app.getHttpServer()).get(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
        });

        it('should FAIL with 404 for a non-existent subsidiary ID', () => {
            return request(app.getHttpServer()).get(`/subsidiaries/${new Types.ObjectId()}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });

    describe('PATCH /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 when updating a subsidiary', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_TO_UPDATE', name: 'Original Name' }).save();
            const updateDto: UpdateSubsidiaryDto = { name: 'Updated Name' };
            return request(app.getHttpServer()).patch(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).send(updateDto).expect(200)
                .then(res => { expect(res.body.name).toEqual('Updated Name'); });
        });
    });

    describe('DELETE /subsidiaries/:subsidiaryId', () => {
        it('should SUCCEED with 200 and soft-delete the subsidiary', async () => {
            const sub = await new subsidiaryModel({ recordId: 'SUB_TO_DELETE', name: 'To Be Deleted' }).save();
            await request(app.getHttpServer()).delete(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
            await request(app.getHttpServer()).get(`/subsidiaries/${sub._id}`).set('Authorization', `Bearer ${adminToken}`).expect(404);
        });
    });
});