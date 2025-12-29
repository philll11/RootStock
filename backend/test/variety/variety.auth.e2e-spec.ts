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

describe('Varieties Authorization (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;
    
    // Models
    let varietyModel: Model<VarietyDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    
    // Tokens
    let adminToken: string;
    let viewerToken: string;
    let noPermsToken: string;

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

        const viewerRole = await roleModel.create({
            recordId: 'VIEWER_ROLE',
            name: 'Viewer Role',
            permissions: [PERMISSIONS.VARIETY_VIEW],
            visibilityScope: VisibilityScope.GLOBAL
        });

        const noPermsRole = await roleModel.create({
            recordId: 'NO_PERMS_ROLE',
            name: 'No Perms Role',
            permissions: [],
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

        const viewerUser = await userModel.create({
            recordId: 'VIEWER_USER',
            name: 'Viewer User',
            firstName: 'Viewer',
            lastName: 'User',
            email: 'viewer@test.com',
            userType: UserType.EMPLOYEE,
            roleId: viewerRole._id
        });

        const noPermsUser = await userModel.create({
            recordId: 'NO_PERMS_USER',
            name: 'No Perms User',
            firstName: 'No',
            lastName: 'Perms',
            email: 'noperms@test.com',
            userType: UserType.EMPLOYEE,
            roleId: noPermsRole._id
        });

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        viewerToken = jwtService.sign({ sub: viewerUser.recordId, tokenVersion: 0 });
        noPermsToken = jwtService.sign({ sub: noPermsUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    beforeEach(async () => {
        await varietyModel.deleteMany({});
        await varietyModel.create({ recordId: 'VAR_EXISTING', name: 'Gala', isActive: true });
    });

    describe('GET /varieties', () => {
        it('should allow user with VARIETY_VIEW permission to list varieties', async () => {
            await request(app.getHttpServer())
                .get('/varieties')
                .set('Authorization', `Bearer ${viewerToken}`)
                .expect(200);
        });

        it('should deny user without VARIETY_VIEW permission', async () => {
            await request(app.getHttpServer())
                .get('/varieties')
                .set('Authorization', `Bearer ${noPermsToken}`)
                .expect(403);
        });
    });

    describe('POST /varieties', () => {
        it('should allow user with VARIETY_CREATE permission to create', async () => {
            const dto: CreateVarietyDto = { name: 'Fuji' };
            await request(app.getHttpServer())
                .post('/varieties')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto)
                .expect(201);
        });

        it('should deny user without VARIETY_CREATE permission', async () => {
            const dto: CreateVarietyDto = { name: 'Fuji' };
            await request(app.getHttpServer())
                .post('/varieties')
                .set('Authorization', `Bearer ${viewerToken}`)
                .send(dto)
                .expect(403);
        });
    });

    describe('PATCH /varieties/:id', () => {
        let varietyId: string;
        let version: number;

        beforeEach(async () => {
            const variety = await varietyModel.findOne({ recordId: 'VAR_EXISTING' });
            varietyId = (variety as any)._id.toString();
            version = (variety as any).__v as number;
        });

        it('should allow user with VARIETY_EDIT permission to update', async () => {
            const dto: UpdateVarietyDto = { name: 'Gala Updated', __v: version };
            await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto)
                .expect(200);
        });

        it('should deny user without VARIETY_EDIT permission', async () => {
            const dto: UpdateVarietyDto = { name: 'Gala Updated', __v: version };
            await request(app.getHttpServer())
                .patch(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send(dto)
                .expect(403);
        });
    });

    describe('DELETE /varieties/:id', () => {
        let varietyId: string;

        beforeEach(async () => {
            const variety = await varietyModel.findOne({ recordId: 'VAR_EXISTING' });
            varietyId = (variety as any)._id.toString();
        });

        it('should allow user with VARIETY_DELETE permission to delete', async () => {
            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });

        it('should deny user without VARIETY_DELETE permission', async () => {
            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .expect(403);
        });
    });
});
