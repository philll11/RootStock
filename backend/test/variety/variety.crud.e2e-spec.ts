import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { CreateVarietyDto } from '../../src/master-data/varieties/dto/create-variety.dto';
import { UpdateVarietyDto } from '../../src/master-data/varieties/dto/update-variety.dto';

describe('Varieties CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;
    
    // Models
    let varietyModel: Model<VarietyDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    
    // Tokens
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create Roles
        const adminRole = await roleModel.create({
            recordId: 'ADMIN_ROLE',
            name: 'Admin Role',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL
        });

        // Create Users
        const adminUser = await userModel.create({
            recordId: 'ADMIN_USER',
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@test.com',
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id
        });

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    beforeEach(async () => {
        await varietyModel.deleteMany({});
    });

    describe('POST /varieties - Creation & Validation', () => {
        it('should successfully create a variety', async () => {
            const dto: CreateVarietyDto = { name: 'Gala' };
            const res = await request(app.getHttpServer())
                .post('/varieties')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto)
                .expect(201);
            
            expect(res.body.name).toBe('Gala');
            expect(res.body.recordId).toMatch(/^VAR\d{3}$/);
            expect(res.body.isActive).toBe(true);
        });

        it('should reject creation with a duplicate name (Case-Insensitive)', async () => {
            await varietyModel.create({ recordId: 'VAR001', name: 'Gala' });
            
            const dto: CreateVarietyDto = { name: 'gala' }; // Lowercase duplicate
            await request(app.getHttpServer())
                .post('/varieties')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto)
                .expect(409);
        });

        it('should reject creation if name is missing', async () => {
            const dto: any = {};
            await request(app.getHttpServer())
                .post('/varieties')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto)
                .expect(400);
        });
    });

    describe('PATCH /varieties/:id - Updates & OCC', () => {
        let varietyId: string;
        let currentVersion: number;

        beforeEach(async () => {
            const variety = await varietyModel.create({
                recordId: 'VAR001',
                name: 'Fuji',
                isActive: true
            });
            varietyId = (variety as any)._id.toString();
            currentVersion = variety.__v as number;
        });

        it('should update successfully when correct version is provided', async () => {
            const updateDto: UpdateVarietyDto = {
                name: 'Fuji Supreme',
                __v: currentVersion
            };

            const res = await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body.name).toBe('Fuji Supreme');
            expect(res.body.__v).toBe(currentVersion + 1);
        });

        it('should fail with 409 Conflict when version is incorrect (OCC)', async () => {
            const updateDto: UpdateVarietyDto = {
                name: 'Fuji Conflict',
                __v: currentVersion + 1 // Incorrect version
            };

            await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(409);
        });

        it('should fail with 400 Bad Request when version is missing', async () => {
            const updateDto: any = {
                name: 'Fuji Missing Version'
            };

            await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should allow renaming to same name with different case (e.g. "fuji" -> "Fuji")', async () => {
             // First create "fuji" (lowercase)
             await varietyModel.deleteMany({});
             const v = await varietyModel.create({ recordId: 'VAR002', name: 'fuji' });
             
             const updateDto: UpdateVarietyDto = {
                 name: 'Fuji', // Rename to Title Case
                 __v: v.__v as number
             };
 
             const res = await request(app.getHttpServer())
                 .patch(`/varieties/${v._id}`)
                 .set('Authorization', `Bearer ${adminToken}`)
                 .send(updateDto)
                 .expect(200);
             
             expect(res.body.name).toBe('Fuji');
        });

        it('should reject renaming to an existing name of another variety', async () => {
            await varietyModel.create({ recordId: 'VAR002', name: 'Honeycrisp' });

            const updateDto: UpdateVarietyDto = {
                name: 'Honeycrisp',
                __v: currentVersion
            };

            await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(409);
        });
    });

    describe('DELETE /varieties/:id', () => {
        let varietyId: string;

        beforeEach(async () => {
            const variety = await varietyModel.create({
                recordId: 'VAR001',
                name: 'Pink Lady',
                isActive: true
            });
            varietyId = (variety as any)._id.toString();
        });

        it('should soft delete the variety', async () => {
            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const deletedVariety = await varietyModel.findById(varietyId);
            expect(deletedVariety?.isDeleted).toBe(true);
            expect(deletedVariety?.isActive).toBe(false);
        });

        // NOTE: Dependency check test (Block usage) will be added when Block resource is implemented
    });
});
