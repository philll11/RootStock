import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { UsersModule } from '../src/users/users.module';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { User, UserDocument, UserType } from '../src/users/entities/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../src/roles/entities/role.schema';

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryServer;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let testAdminRoleId: string;
    let testGrowerRole: string;
    let createdUserId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(uri),
                UsersModule
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

        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));

        await userModel.syncIndexes();
        await roleModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
        await roleModel.deleteMany({});

        const adminRole: RoleDocument = await new roleModel({
            recordId: 'USER_E2E_ROL001',
            name: 'USER Administrator',
            visibilityScope: VisibilityScope.GLOBAL,
        }).save();
        testAdminRoleId = adminRole._id.toString();

        const growerRole: RoleDocument = await new roleModel({
            recordId: 'USER_E2E_ROL003',
            name: 'USER Grower',
            visibilityScope: VisibilityScope.CLIENT,
        }).save();
        testGrowerRole = growerRole._id.toString();
    });

    describe('POST /users', () => {
        it('should SUCCEED with 201 Created when creating a new employee user and derive the full name when given valid data', async () => {
            const createUserDto: CreateUserDto = {
                recordId: 'USER_E2E_USER001',
                firstName: 'John',
                lastName: 'Doe',
                userType: UserType.EMPLOYEE,
                roleId: testAdminRoleId,
            };

            const response = await request(app.getHttpServer())
                .post('/users')
                .send(createUserDto)
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.firstName).toEqual('John');
            expect(response.body.name).toEqual('John Doe');
            createdUserId = response.body._id;
        });

        it('should FAIL with 400 Bad Request when creating a user with a non-existent roleId', () => {
            const fakeRoleId = '63b4c5d6e7f8a9b0c1d2e3f5';
            const createUserDto: CreateUserDto = {
                recordId: 'USER_E2E_USER002',
                firstName: 'Jane',
                lastName: 'Smith',
                userType: UserType.EMPLOYEE,
                roleId: fakeRoleId,
            };

            return request(app.getHttpServer())
                .post('/users')
                .send(createUserDto)
                .expect(400)
                .then((response) => {
                    expect(response.body.message).toContain(`Role with ID "${fakeRoleId}" does not exist or is not active.`);
                });
        });

        it('should FAIL with 400 Bad Request when creating a "contact" user with an empty clientIds array', () => {
            const createUserDto: CreateUserDto = {
                recordId: 'USER_E2E_USER00X1',
                firstName: 'Bad',
                lastName: 'Contact',
                userType: UserType.CONTACT,
                roleId: testGrowerRole,
                clientIds: [],
            };

            return request(app.getHttpServer())
                .post('/users')
                .send(createUserDto)
                .expect(400)
                .then((response) => {
                    expect(response.body.message).toContain('Users with type "contact" must be assigned to exactly one client.');
                });
        });

        it('should SUCCEED with 201 Created when creating a "contact" user successfully when clientIds has exactly one element', () => {
            const fakeClientId = '63b4c5d6e7f8a9b0c1d2e3f5';
            const createUserDto: CreateUserDto = {
                recordId: 'USER_E2E_USER00X2',
                firstName: 'Good',
                lastName: 'Contact',
                userType: UserType.CONTACT,
                roleId: testGrowerRole,
                clientIds: [fakeClientId],
            };

            return request(app.getHttpServer())
                .post('/users')
                .send(createUserDto)
                .expect(201)
                .then((response) => {
                    expect(response.body.userType).toEqual(UserType.CONTACT);
                    expect(response.body.clientIds).toEqual([fakeClientId]);
                });
        });
    });

    describe('GET /users', () => {
        beforeEach(async () => {
            const user: UserDocument = await new userModel({
                recordId: 'USER_E2E_USER003',
                firstName: 'Find',
                lastName: 'Me',
                name: 'Find Me',
                userType: UserType.EMPLOYEE,
                roleId: testAdminRoleId,
            }).save();
            createdUserId = user._id.toString();
        });

        it('should SUCCEED with 200 OK when returning a single user when a valid ID is provided in the path', () => {
            return request(app.getHttpServer())
                .get(`/users/${createdUserId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body._id).toEqual(createdUserId);
                    expect(response.body.name).toEqual('Find Me');
                });
        });

        it('should SUCCEED with 200 OK when returning only "contact" users when filtering by userType=contact', async () => {
            await new userModel({
                recordId: 'USER_E2E_USER004',
                firstName: 'Contact',
                lastName: 'User',
                name: 'Contact User',
                userType: UserType.CONTACT,
                roleId: testAdminRoleId,
            }).save();

            const response = await request(app.getHttpServer())
                .get('/users?userType=contact')
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0].userType).toEqual(UserType.CONTACT);
        });
    });

    describe('PATCH /users/:userId', () => {
        beforeEach(async () => {
            const user: UserDocument = await new userModel({
                recordId: 'USER_E2E_USER005',
                firstName: 'Update',
                lastName: 'Me',
                name: 'Update Me',
                userType: UserType.EMPLOYEE,
                roleId: testAdminRoleId,
            }).save();
            createdUserId = user._id.toString();
        });

        it('should SUCCEED with 200 OK when updating a user and correctly derive the new name when firstName is changed', () => {
            const updateUserDto = { firstName: 'Updated' };
            return request(app.getHttpServer())
                .patch(`/users/${createdUserId}`)
                .send(updateUserDto)
                .expect(200)
                .then((response) => {
                    expect(response.body.firstName).toEqual('Updated');
                    expect(response.body.name).toEqual('Updated Me');
                });
        });

        it('should SUCCEED with 200 OK when updating the isActive status when the user is an administrator', () => {
            return request(app.getHttpServer())
                .patch(`/users/${createdUserId}`)
                .send({ isActive: false })
                .expect(200)
                .then((response) => {
                    expect(response.body.isActive).toBe(false);
                });
        });
    });

    describe('DELETE /users/:userId', () => {
        beforeEach(async () => {
            const user: UserDocument = await new userModel({
                recordId: 'USER_E2E_USER006',
                firstName: 'Delete',
                lastName: 'Me',
                name: 'Delete Me',
                userType: UserType.EMPLOYEE,
                roleId: testAdminRoleId,
            }).save();
            createdUserId = user._id.toString();
        });

        it('should SUCCEED with 200 OK when setting isDeleted to true and isActive to false on successful soft-delete', () => {
            return request(app.getHttpServer())
                .delete(`/users/${createdUserId}`)
                .expect(200)
                .then((response) => {
                    expect(response.body.isDeleted).toBe(true);
                    expect(response.body.isActive).toBe(false);
                });
        });

        it('should FAIL with 404 Not Found when trying to GET a soft-deleted user by ID', async () => {
            await request(app.getHttpServer()).delete(`/users/${createdUserId}`);
            return request(app.getHttpServer())
                .get(`/users/${createdUserId}`)
                .expect(404);
        });
    });
});