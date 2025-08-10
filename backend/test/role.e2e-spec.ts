import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { DatabaseModule } from '../src/database/database.module';

import { UsersModule } from '../src/users/users.module';
import { User, UserDocument, UserType } from '../src/users/entities/user.schema';

import { RolesModule } from '../src/roles/roles.module';
import { Role, VisibilityScope, RoleDocument } from '../src/roles/entities/role.schema';
import { CreateRoleDto } from '../src/roles/dto/create-role.dto';

describe('RolesController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let createdRoleId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(uri),
                DatabaseModule,
                RolesModule,
                UsersModule,
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
        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));

        await roleModel.syncIndexes();
        await userModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await roleModel.deleteMany({});
        await userModel.deleteMany({});
    });

    describe('POST /roles', () => {
        it('should SUCCEED with 201 Created when creating a new role successfully', async () => {
            const createRoleDto: CreateRoleDto = { recordId: 'ROL_E2E_ROL001', name: 'ROL Test Role', visibilityScope: VisibilityScope.CLIENT };
            const response = await request(app.getHttpServer()).post('/roles').send(createRoleDto).expect(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toEqual('ROL Test Role');
        });

        it('should FAIL with a 409 Conflict if a role with the same name already exists', async () => {
            await new roleModel({ recordId: 'ROL_E2E_ROL002', name: 'ROL Duplicate Role', visibilityScope: VisibilityScope.GLOBAL }).save();
            const duplicateDto: CreateRoleDto = { recordId: 'ROL_E2E_ROL002', name: 'ROL Duplicate Role', visibilityScope: VisibilityScope.GLOBAL };
            return request(app.getHttpServer()).post('/roles').send(duplicateDto).expect(409);
        });

        it('should FAIL with a 400 Bad Request if visibilityScope is missing', () => {
            const incompleteDto = { name: 'Incomplete Role' };
            return request(app.getHttpServer()).post('/roles').send(incompleteDto).expect(400);
        });
    });

    describe('GET /roles', () => {
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({ recordId: 'ROL_E2E_ROL003', name: 'ROL Find Me Role', visibilityScope: VisibilityScope.CLIENT }).save();
            createdRoleId = role._id.toString();
        });

        it('should SUCCEED with 200 OK when querying a specific role by its ID', () => {
            return request(app.getHttpServer()).get(`/roles/${createdRoleId}`).expect(200).then((response) => {
                expect(response.body._id).toEqual(createdRoleId);
            });
        });

        it('should SUCCEED with 200 OK and return both active and inactive roles when includeInactives=true is queried', async () => {
            await new roleModel({ recordId: 'ROL_E2E_ROL004', name: 'ROL Inactive Role', visibilityScope: VisibilityScope.CLIENT, isActive: false }).save();
            const response = await request(app.getHttpServer()).get('/roles?includeInactives=true').expect(200);
            expect(response.body.length).toBe(2);
        });
    });

    describe('GET /roles/:roleId/users', () => {
        let activeRoleId: string;
        let inactiveRoleId: string;

        beforeEach(async () => {
            const activeRole = await new roleModel({ recordId: 'ACTIVE_ROLE', name: 'Active Role', visibilityScope: VisibilityScope.CLIENT }).save();
            activeRoleId = activeRole._id.toString();
            await new userModel({ recordId: 'U1', name: 'User of Active Role', firstName: 'U', lastName: '1', userType: UserType.EMPLOYEE, roleId: activeRoleId }).save();

            const inactiveRole = await new roleModel({ recordId: 'INACTIVE_ROLE', name: 'Inactive Role', visibilityScope: VisibilityScope.CLIENT, isActive: false }).save();
            inactiveRoleId = inactiveRole._id.toString();
            await new userModel({ recordId: 'U2', name: 'User of Inactive Role', firstName: 'U', lastName: '2', userType: UserType.EMPLOYEE, roleId: inactiveRoleId }).save();
        });

        it('should SUCCEED with 200 OK when requesting users for an ACTIVE role', () => {
            return request(app.getHttpServer()).get(`/roles/${activeRoleId}/users`).expect(200).then(res => {
                expect(res.body.length).toBe(1);
                expect(res.body[0].name).toBe('User of Active Role');
            });
        });

        it('should FAIL with 404 Not Found when requesting users for an INACTIVE role', () => {
            return request(app.getHttpServer()).get(`/roles/${inactiveRoleId}/users`).expect(404);
        });
    });

    // *** MODIFIED BLOCK WITH NEW TESTS ***
    describe('PATCH /roles/:roleId', () => {
        let roleToUpdateId: string;
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({ recordId: 'ROL_E2E_ROL005', name: 'Update Me', visibilityScope: VisibilityScope.CLIENT }).save();
            roleToUpdateId = role._id.toString();
        });

        it('should SUCCEED with 200 OK when updating a role successfully', () => {
            return request(app.getHttpServer()).patch(`/roles/${roleToUpdateId}`).send({ name: 'Updated Role Name' }).expect(200).then((response) => {
                expect(response.body.name).toEqual('Updated Role Name');
            });
        });

        it('should FAIL with 409 Conflict when trying to deactivate a role that has active users', async () => {
            await new userModel({ recordId: 'ACTIVE_USER', name: 'Active User', firstName: 'Active', lastName: 'User', userType: UserType.EMPLOYEE, roleId: roleToUpdateId }).save();
            return request(app.getHttpServer()).patch(`/roles/${roleToUpdateId}`).send({ isActive: false }).expect(409).then(res => {
                expect(res.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it.');
            });
        });
        
        it('should SUCCEED when deactivating a role that has only inactive users', async () => {
            await new userModel({ recordId: 'INACTIVE_USER', name: 'Inactive User', firstName: 'Inactive', lastName: 'User', userType: UserType.EMPLOYEE, roleId: roleToUpdateId, isActive: false }).save();
            return request(app.getHttpServer()).patch(`/roles/${roleToUpdateId}`).send({ isActive: false }).expect(200).then(res => {
                expect(res.body.isActive).toBe(false);
            });
        });
    });

    describe('DELETE /roles/:roleId', () => {
        beforeEach(async () => {
            const role: RoleDocument = await new roleModel({ recordId: 'ROL_E2E_ROL006', name: 'ROL Delete Me', visibilityScope: VisibilityScope.CLIENT }).save();
            createdRoleId = role._id.toString();
        });

        it('should SUCCEED with 200 OK when soft-deleting a role successfully', () => {
            return request(app.getHttpServer()).delete(`/roles/${createdRoleId}`).expect(200).then((response) => {
                expect(response.body.isDeleted).toBe(true);
                expect(response.body.isActive).toBe(false);
            });
        });
        
        it('should SUCCEED with 200 OK when atomically unassign all linked users when a role is deleted', async () => {
            const otherRole = await new roleModel({ recordId: 'ROL-OTHER', name: 'Other Role', visibilityScope: VisibilityScope.CLIENT }).save();
            const user1 = await new userModel({ recordId: 'U1', firstName: 'Test', lastName: 'User1', name: 'Test User1', userType: UserType.EMPLOYEE, roleId: createdRoleId }).save();
            const user2 = await new userModel({ recordId: 'U2', firstName: 'Test', lastName: 'User2', name: 'Test User2', userType: UserType.EMPLOYEE, roleId: otherRole._id }).save();

            await request(app.getHttpServer()).delete(`/roles/${createdRoleId}`).expect(200);

            const updatedUser1 = await userModel.findById(user1._id);
            const unaffectedUser2 = await userModel.findById(user2._id);

            expect(updatedUser1).not.toBeNull();
            expect(updatedUser1!.roleId).toBeNull();
            expect(unaffectedUser2).not.toBeNull();
            expect(unaffectedUser2!.roleId.toString()).toEqual(otherRole._id.toString());
        });
    });
});