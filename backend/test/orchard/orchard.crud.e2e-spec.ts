import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../../src/orchards/schemas/orchard.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { CreateOrchardDto } from '../../src/orchards/dto/create-orchard.dto';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Orchards CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let orchardModel: Model<OrchardDocument>;
    let userModel: Model<UserDocument>;

    // User Tokens
    let globalAdminToken: string;
    let clientOwnerToken: string;

    // Test Data Entities
    let testClientA: ClientDocument, testClientB: ClientDocument, inactiveClient: ClientDocument;
    let validContactUserA: UserDocument, validContactUserB: UserDocument, inactiveContactUser: UserDocument, employeeUser: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        const testSubsidiary = await subsidiaryModel.create({ recordId: 'SUB_CRUD', name: 'CRUD Subsidiary' });

        [testClientA, testClientB, inactiveClient] = await clientModel.create([
            { recordId: 'CLI_CRUD_A', name: 'CRUD Client A', subsidiaryId: testSubsidiary._id },
            { recordId: 'CLI_CRUD_B', name: 'CRUD Client B', subsidiaryId: testSubsidiary._id },
            { recordId: 'CLI_CRUD_INACTIVE', name: 'CRUD Inactive Client', isActive: false },
        ]);

        const [globalAdminRole, clientOwnerRole, contactRole] = await roleModel.create([
            { recordId: 'ADM_ROL', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'OWN_ROL', name: 'Owner', permissions: [PERMISSIONS.ORCHARD_CREATE, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT, PERMISSIONS.ORCHARD_DELETE, PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'CON_ROL', name: 'Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
        ]);

        const [globalAdmin, clientOwner] = await userModel.create([
            { recordId: 'ADMIN_CRUD', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin_crud@test.com', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id },
            { recordId: 'OWNER_CRUD', name: 'Owner', firstName: 'Owner', lastName: 'User', email: 'owner_crud@test.com', userType: UserType.CONTACT, roleId: clientOwnerRole._id, clientIds: [testClientA._id] },
        ]);

        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId });
        clientOwnerToken = jwtService.sign({ sub: clientOwner.recordId });

        [validContactUserA, validContactUserB, inactiveContactUser, employeeUser] = await userModel.create([
            { recordId: 'CONTACT_CRUD_A', name: 'Contact A', firstName: 'Contact', lastName: 'A', email: 'contact_crud_a@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [testClientA._id] },
            { recordId: 'CONTACT_CRUD_B', name: 'Contact B', firstName: 'Contact', lastName: 'B', email: 'contact_crud_b@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [testClientB._id] },
            { recordId: 'CONTACT_CRUD_INACTIVE', name: 'Inactive Contact', firstName: 'Inactive', lastName: 'Contact', email: 'inactive_crud@contact.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [testClientA._id], isActive: false },
            { recordId: 'EMPLOYEE_CRUD', name: 'Employee', firstName: 'Employee', lastName: 'User', email: 'employee_crud@test.com', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id, clientIds: [testClientA._id] },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => await orchardModel.deleteMany({}));

    describe('POST /orchards - Creation & Validation', () => {
        it('should successfully create a valid orchard with all fields', async () => {
            const createDto: CreateOrchardDto = {
                name: 'Honeycrisp Orchard - North Valley',
                clientId: testClientA._id.toString(),
                address: { street: '1500 Valley Road', city: 'Wenatchee', state: 'WA' },
                userIds: [validContactUserA._id.toString()]
            };
            const res = await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(201);
            expect(res.body.name).toBe(createDto.name);
            expect(res.body.recordId).toMatch(/^ORC\d{4}$/);
            expect(res.body.userIds).toBeInstanceOf(Array);
            expect(res.body.userIds).toContain(validContactUserA._id.toString());
        });

        it('should reject creation with missing required fields (name, clientId)', async () => {
            await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send({ clientId: testClientA._id.toString() }).expect(400);
            await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send({ name: 'Orchard with no client' }).expect(400);
        });

        it('should reject creation for a non-existent client', async () => {
            const nonExistentClientId = new Types.ObjectId().toHexString();
            const createDto: CreateOrchardDto = { name: 'Invalid Client Orchard', clientId: nonExistentClientId };
            await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(400);
        });

        it('should reject creation for an inactive client', async () => {
            const createDto: CreateOrchardDto = { name: 'Inactive Client Orchard', clientId: inactiveClient._id.toString() };
            await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(400);
        });

        it('should reject creation if assigning an inactive user', async () => {
            const createDto: CreateOrchardDto = { name: 'Orchard with Inactive User', clientId: testClientA._id.toString(), userIds: [inactiveContactUser._id.toString()] };
            await request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(400);
        });
    });

    describe('GET /orchards - Retrieval & Filtering', () => {
        let orchardA: OrchardDocument;
        beforeEach(async () => {
            [orchardA] = await orchardModel.create([
                { recordId: 'ORCH_GET_A', name: 'Apple Orchard', clientId: testClientA._id },
                { recordId: 'ORCH_GET_B', name: 'Berry Orchard', clientId: testClientB._id },
            ]);
        });

        it('should retrieve a single orchard by ID with populated data', async () => {
            const res = await request(app.getHttpServer()).get(`/orchards/${orchardA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body.recordId).toBe('ORCH_GET_A');
            expect(res.body.clientId.recordId).toBe('CLI_CRUD_A');
        });

        it('should filter orchards by name (case-insensitive)', async () => {
            const res = await request(app.getHttpServer()).get('/orchards?name=apple').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('ORCH_GET_A');
        });
    });

    describe('PATCH /orchards/:id - Updates & Business Logic', () => {
        let testOrchard: OrchardDocument;
        beforeEach(async () => {
            testOrchard = await orchardModel.create({ recordId: 'ORCH_PATCH', name: 'Test Orchard', clientId: testClientA._id, userIds: [validContactUserA._id] });
        });

        it('should successfully update an orchard`s name and user list', async () => {
            const res = await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${clientOwnerToken}`)
                .send({ name: 'Updated Orchard Name', userIds: [validContactUserA._id.toString(), employeeUser._id.toString()] }).expect(200);
            expect(res.body.name).toBe('Updated Orchard Name');
            expect(res.body.userIds).toEqual(
                expect.arrayContaining([validContactUserA._id.toString(), employeeUser._id.toString()])
            );
        });

        it('should clear user assignments when an empty array is passed', async () => {
            const res = await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${clientOwnerToken}`)
                .send({ userIds: [] }).expect(200);
            expect(res.body.userIds).toHaveLength(0);
        });

        it('should reject an update with invalid (non-existent) user IDs', async () => {
            const nonExistentId = new Types.ObjectId().toHexString();
            await request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${clientOwnerToken}`)
                .send({ userIds: [nonExistentId] }).expect(400);
        });
    });

    describe('DELETE /orchards/:id - Deletion', () => {
        let testOrchard: OrchardDocument;
        beforeEach(async () => {
            testOrchard = await orchardModel.create({ recordId: 'ORCH_DELETE', name: 'To Be Deleted', clientId: testClientA._id });
        });

        it('should successfully soft-delete an orchard', async () => {
            await request(app.getHttpServer()).delete(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${clientOwnerToken}`).expect(200);
            const deleted = await orchardModel.findById(testOrchard._id);
            expect(deleted).not.toBeNull();
            expect(deleted!.isDeleted).toBe(true);
            expect(deleted!.isActive).toBe(false);
        });

        it('should return 404 when trying to GET a soft-deleted orchard', async () => {
            await orchardModel.updateOne({ _id: testOrchard._id }, { isDeleted: true });
            await request(app.getHttpServer()).get(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${clientOwnerToken}`).expect(404);
        });
    });
});