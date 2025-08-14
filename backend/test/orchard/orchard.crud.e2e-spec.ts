import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

// Import our utility functions
import { setupTestApp, teardownTestApp } from '../test-utils';

// Import Schemas and DTOs
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../../src/orchards/schemas/orchard.schema';
import { CreateOrchardDto } from '../../src/orchards/dto/create-orchard.dto';
import { UpdateOrchardDto } from '../../src/orchards/dto/update-orchard.dto';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('OrchardsController (e2e) - CRUD', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;

    // Test Data
    let adminToken: string;
    let testClientId: string;
    let inactiveClientId: string;
    let validContactUserId: string;
    let employeeUserId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        // Use our utility function to set up the app
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models directly from the app instance
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // Seed a global admin role and user for all tests in this suite
        const adminRole = await new roleModel({
            recordId: 'ROLE_ORCHARD_ADMIN', name: 'Orchard Admin',
            permissions: [PERMISSIONS.ORCHARD_CREATE, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT, PERMISSIONS.ORCHARD_DELETE],
            visibilityScope: VisibilityScope.GLOBAL,
        }).save();
        const adminUser = await new userModel({
            recordId: 'USER_ORCHARD_ADMIN', name: 'Orchard Admin', firstName: 'Orchard', lastName: 'Admin',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        await orchardModel.deleteMany({});
        await clientModel.deleteMany({});
        await userModel.deleteMany({ recordId: { $ne: 'USER_ORCHARD_ADMIN' } });

        const testClient = await new clientModel({ recordId: 'CLIENT_VALID', name: 'Valid Client' }).save();
        testClientId = testClient._id.toString();

        const inactiveClient = await new clientModel({ recordId: 'CLIENT_INACTIVE', name: 'Inactive Client', isActive: false }).save();
        inactiveClientId = inactiveClient._id.toString();

        const contactUser = await new userModel({ recordId: 'CONTACT_USER_O', name: 'Contact User', firstName: 'Contact', lastName: 'Test', userType: UserType.CONTACT }).save();
        validContactUserId = contactUser._id.toString();

        const employeeUser = await new userModel({ recordId: 'EMPLOYEE_USER_O', name: 'Employee User', firstName: 'Employee', lastName: 'Test', userType: UserType.EMPLOYEE }).save();
        employeeUserId = employeeUser._id.toString();
    });

    describe('POST /orchards', () => {
        it('should SUCCEED with 201 when creating an orchard with a valid contact user', () => {
            const createDto: CreateOrchardDto = {
                recordId: 'ORCH_VALID_WITH_USER', name: 'Valid Orchard With User',
                clientId: testClientId, userIds: [validContactUserId]
            };
            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toEqual('Valid Orchard With User');
                    expect(res.body.userIds).toEqual([validContactUserId]);
                });
        });

        it('should SUCCEED with 201 when creating an orchard with valid data', () => {
            const createDto: CreateOrchardDto = { recordId: 'ORCH_VALID', name: 'Valid Orchard', clientId: testClientId };
            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toEqual('Valid Orchard');
                    expect(res.body.clientId).toEqual(testClientId);
                });
        });

        it('should FAIL with 400 for missing required fields (e.g., name)', () => {
            const incompleteDto = { recordId: 'ORCH_INCOMPLETE', clientId: testClientId };
            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(incompleteDto)
                .expect(400);
        });

        it('should FAIL with 409 Conflict for a duplicate recordId', async () => {
            const createDto: CreateOrchardDto = { recordId: 'ORCH_DUPE', name: 'First Orchard', clientId: testClientId };
            await new orchardModel(createDto).save();

            const duplicateDto: CreateOrchardDto = { recordId: 'ORCH_DUPE', name: 'Second With Same ID', clientId: testClientId };
            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(duplicateDto)
                .expect(409);
        });
    });

    describe('POST /orchards (Relational Validation)', () => {
        it('should FAIL with 400 if clientId does not exist', () => {
            const nonExistentMongoId = new Types.ObjectId().toHexString();
            const createDto: CreateOrchardDto = { recordId: 'ORCH_BAD_CLIENT', name: 'Orchard With Invalid Client', clientId: nonExistentMongoId };

            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400);
        });

        it('should FAIL with 400 if clientId points to an INACTIVE client', () => {
            const createDto: CreateOrchardDto = { recordId: 'ORCH_INACTIVE_CLIENT', name: 'Orchard With Inactive Client', clientId: inactiveClientId };

            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400);
        });

        it('should FAIL with 400 if userIds contains a non-existent user', () => {
            const nonExistentUserId = new Types.ObjectId().toHexString();
            const createDto: CreateOrchardDto = { recordId: 'ORCH_BAD_USER', name: 'Orchard With Bad User', clientId: testClientId, userIds: [nonExistentUserId] };

            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400)
                .then(res => {
                    expect(res.body.message[0]).toContain("do not exist, are inactive, or are not 'contact' type users.");
                });
        });

        it('should FAIL with 400 if userIds contains a user who is not a CONTACT', () => {
            const createDto: CreateOrchardDto = { recordId: 'ORCH_EMPLOYEE_USER', name: 'Orchard With Employee User', clientId: testClientId, userIds: [employeeUserId] };

            return request(app.getHttpServer())
                .post('/orchards')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(400)
                .then(res => {
                    expect(res.body.message[0]).toContain("do not exist, are inactive, or are not 'contact' type users.");
                });
        });
    });

    describe('GET /orchards/:id', () => {
        it('should SUCCEED with 200 when finding a specific orchard by its ID', async () => {
            const orchard = await new orchardModel({ recordId: 'ORCH_FIND_ME', name: 'Find Me Orchard', clientId: testClientId }).save();
            return request(app.getHttpServer())
                .get(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body._id).toEqual(orchard._id.toString());
                });
        });
    });

    describe('PATCH /orchards/:id', () => {
        it('should SUCCEED with 200 when updating an orchard\'s userIds', async () => {
            const orchard = await new orchardModel({ recordId: 'ORCH_TO_UPDATE_USERS', name: 'Original Name', clientId: testClientId }).save();
            const updateDto: UpdateOrchardDto = { userIds: [validContactUserId] };

            return request(app.getHttpServer())
                .patch(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.userIds).toEqual([validContactUserId]);
                });
        });

        it('should SUCCEED with 200 when removing users with an empty array', async () => {
            const orchard = await new orchardModel({ recordId: 'ORCH_TO_CLEAR_USERS', name: 'Original Name', clientId: testClientId, userIds: [validContactUserId] }).save();
            const updateDto: UpdateOrchardDto = { userIds: [] };

            return request(app.getHttpServer())
                .patch(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.userIds).toEqual([]);
                });
        });

        it('should SUCCEED with 200 when updating an orchard', async () => {
            const orchard = await new orchardModel({ recordId: 'ORCH_TO_UPDATE', name: 'Original Name', clientId: testClientId }).save();
            const updateDto: UpdateOrchardDto = { name: 'Updated Name' };

            return request(app.getHttpServer())
                .patch(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.name).toEqual('Updated Name');
                });
        });
    });

    describe('DELETE /orchards/:id', () => {
        it('should SUCCEED with 200 and soft-delete the orchard', async () => {
            const orchard = await new orchardModel({ recordId: 'ORCH_TO_DELETE', name: 'To Be Deleted', clientId: testClientId }).save();

            await request(app.getHttpServer())
                .delete(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });

            // Verify it can no longer be fetched by a standard GET
            await request(app.getHttpServer())
                .get(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });
});