import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { RolesModule } from '../src/roles/roles.module';
import { Role, VisibilityScope, RoleDocument } from '../src/roles/entities/role.schema';
import { CreateRoleDto } from '../src/roles/dto/create-role.dto';

describe('RolesController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryServer;
    let roleModel: Model<RoleDocument>;
    let createdRoleId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(uri),
                RolesModule,
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

        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

        await roleModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await roleModel.deleteMany({});
    });

    describe('POST /roles', () => {
        // Test Case: Creating a new role with valid data.
        it('should create a new role successfully', async () => {
            const createRoleDto: CreateRoleDto = {
                recordId: 'ROL_E2E_ROL001',
                name: 'ROL Test Role',
                visibilityScope: VisibilityScope.CLIENT,
            };

            const response = await request(app.getHttpServer())
                .post('/roles')
                .send(createRoleDto)
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toEqual('ROL Test Role');
            createdRoleId = response.body._id;
        });

        // Test Case: Preventing creation of roles with a duplicate name.
        it('should fail with a 409 Conflict if a role with the same name already exists', async () => {
            await new roleModel({
                recordId: 'ROL_E2E_ROL002',
                name: 'ROL Duplicate Role',
                visibilityScope: VisibilityScope.GLOBAL
            }).save();

            const duplicateDto: CreateRoleDto = {
                recordId: 'ROL_E2E_ROL002',
                name: 'ROL Duplicate Role',
                visibilityScope: VisibilityScope.GLOBAL,
            };

            return request(app.getHttpServer())
                .post('/roles')
                .send(duplicateDto)
                .expect(409);
        });

        // Test Case: Verifying validation for required fields.
        it('should fail with a 400 Bad Request if visibilityScope is missing', () => {
            const incompleteDto = { name: 'Incomplete Role' };
            return request(app.getHttpServer())
                .post('/roles')
                .send(incompleteDto)
                .expect(400);
        });
    });

    describe('GET /roles', () => {
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({
                recordId: 'ROL_E2E_ROL003',
                name: 'ROL Find Me Role',
                visibilityScope: VisibilityScope.CLIENT,
            }).save();
            createdRoleId = role._id.toString();
        });

        // Test Case: Finding a single, active role by its ID.
        it('should find a specific role by its ID', () => {
            return request(app.getHttpServer())
                .get(`/roles/${createdRoleId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body._id).toEqual(createdRoleId);
                });
        });

        // Test Case: Verifying advanced filtering for inactive records.
        it('should return both active and inactive roles when includeInactives=true is queried', async () => {
            await new roleModel({
                recordId: 'ROL_E2E_ROL004',
                name: 'ROL Inactive Role',
                visibilityScope: VisibilityScope.CLIENT,
                isActive: false
            }).save();

            const response = await request(app.getHttpServer())
                .get('/roles?includeInactives=true')
                .expect(200);

            expect(response.body.length).toBe(2);
        });
    });

    describe('PATCH /roles/:roleId', () => {
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({
                recordId: 'ROL_E2E_ROL005',
                name: 'Update Me',
                visibilityScope: VisibilityScope.CLIENT
            }).save();
            createdRoleId = role._id.toString();
        });

        // Test Case: Successfully updating a role's name.
        it('should update a role successfully', () => {
            return request(app.getHttpServer())
                .patch(`/roles/${createdRoleId}`)
                .send({ name: 'Updated Role Name' })
                .expect(200)
                .then((response) => {
                    expect(response.body.name).toEqual('Updated Role Name');
                });
        });
    });

    describe('DELETE /roles/:roleId', () => {
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({
                recordId: 'ROL_E2E_ROL006',
                name: 'ROL Delete Me',
                visibilityScope: VisibilityScope.CLIENT
            }).save();
            createdRoleId = role._id.toString();
        });

        // Test Case: Successfully soft-deleting a role.
        it('should soft-delete a role successfully', () => {
            return request(app.getHttpServer())
                .delete(`/roles/${createdRoleId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body.isDeleted).toBe(true);
                    expect(response.body.isActive).toBe(false);
                });
        });

        // Test Case: Verifying a soft-deleted role is not found by default.
        it('should return a 404 Not Found when trying to get the soft-deleted role by default', async () => {
            await request(app.getHttpServer()).delete(`/roles/${createdRoleId}`);
            return request(app.getHttpServer())
                .get(`/roles/${createdRoleId}`)
                .expect(404);
        });

        // Test Case: Verifying a soft-deleted role can be retrieved from the "recycling bin".
        it('should find the soft-deleted role when isDeleted=true is queried', async () => {
            await request(app.getHttpServer()).delete(`/roles/${createdRoleId}`);

            const response = await request(app.getHttpServer())
                .get('/roles?isDeleted=true')
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0]._id).toEqual(createdRoleId);
        });

        // Test Case: Verifying that multiple roles with the same name can be soft-deleted.
        it('should allow multiple soft-deleted roles to have the same name', async () => {
            const roleName = 'ROL Recycled Role';

            const firstRole = await new roleModel({
                recordId: 'ROL_E2E_ROL007',
                name: roleName,
                visibilityScope: VisibilityScope.CLIENT,
            }).save();

            await request(app.getHttpServer())
                .delete(`/roles/${firstRole._id}`)
                .expect(200);

            const createSecondRoleDto: CreateRoleDto = {
                recordId: 'ROL_E2E_ROL008',
                name: roleName,
                visibilityScope: VisibilityScope.CLIENT,
            };

            const response = await request(app.getHttpServer())
                .post('/roles')
                .send(createSecondRoleDto)
                .expect(201);

            const secondRoleId = response.body._id;

            await request(app.getHttpServer())
                .delete(`/roles/${secondRoleId}`)
                .expect(200);

            const deletedRoles = await request(app.getHttpServer())
                .get(`/roles?isDeleted=true&name=${roleName}`)
                .expect(200);

            expect(deletedRoles.body.length).toBe(2);
            expect(deletedRoles.body[0].name).toEqual(roleName);
            expect(deletedRoles.body[1].name).toEqual(roleName);
        });
    });
});