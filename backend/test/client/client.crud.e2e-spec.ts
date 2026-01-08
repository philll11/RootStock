// backend/test/client/client.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { CreateClientDto } from '../../src/iam/clients/dto/create-client.dto';
import { UpdateClientDto } from '../../src/iam/clients/dto/update-client.dto';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Orchard } from '../../src/assets/orchards/schemas/orchard.schema';

describe('Clients CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let orchardModel: Model<any>;

    // Tokens
    let globalAdminToken: string;

    // Test Data Entities
    let testSubsidiary: SubsidiaryDocument, inactiveSubsidiary: SubsidiaryDocument;
    let testClientA: ClientDocument;
    let contactUserSubA: UserDocument, contactUserSubB: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        orchardModel = app.get<Model<any>>(getModelToken(Orchard.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        
        [testSubsidiary, inactiveSubsidiary] = await subsidiaryModel.create([
            { recordId: 'SUB_CRUD', name: 'CRUD Test Subsidiary' },
            { recordId: 'SUB_CRUD_INACTIVE', name: 'CRUD Inactive Subsidiary', isActive: false },
        ]);
        const subB = await subsidiaryModel.create({ recordId: 'SUB_B', name: 'Subsidiary B' });

        testClientA = await clientModel.create({ recordId: 'CLI_A', name: 'Client A', subsidiaryId: testSubsidiary._id });
        const clientC_subB = await clientModel.create({ recordId: 'CLI_C', name: 'Client C in Sub B', subsidiaryId: subB._id });

        const [adminRole, contactRole] = await roleModel.create([
            { recordId: 'ROLE_ADMIN', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_CONTACT', name: 'Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
        ]);

        const globalAdmin = await userModel.create({ recordId: 'ADMIN_CRUD', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin_crud_client@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id });
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });

        [contactUserSubA, contactUserSubB] = await userModel.create([
            { recordId: 'CONTACT_A', name: 'Contact A', firstName: 'Contact', lastName: 'A', email: 'contact_a_client@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [testClientA._id] },
            { recordId: 'CONTACT_B', name: 'Contact B', firstName: 'Contact', lastName: 'B', email: 'contact_b_client@test.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [clientC_subB._id] },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => {
        // Clean collections but preserve the foundational data from beforeAll
        await clientModel.deleteMany({ recordId: { $nin: ['CLI_A', 'CLI_C'] } });
        await userModel.deleteMany({ recordId: { $nin: ['ADMIN_CRUD', 'CONTACT_A', 'CONTACT_B'] } });
        await orchardModel.deleteMany({});
    });

    describe('POST /clients - Creation & Validation', () => {
        it('should create a client with a subsidiary and an independent client', async () => {
            const withSubDto: CreateClientDto = { name: 'New Sub Client', subsidiaryId: testSubsidiary._id.toString() };
            const noSubDto: CreateClientDto = { name: 'New Independent Client' };

            const res1 = await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${globalAdminToken}`).send(withSubDto).expect(201);
            expect(res1.body.subsidiaryId._id).toBe(testSubsidiary._id.toString());
            expect(res1.body.recordId).toMatch(/^CLI\d{4}$/);

            const res2 = await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${globalAdminToken}`).send(noSubDto).expect(201);
            expect(res2.body.subsidiaryId).toBeUndefined();
        });

        it('should reject creation if required field (name) is missing', async () => {
            await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${globalAdminToken}`).send({ subsidiaryId: testSubsidiary._id.toString() }).expect(400);
        });

        it('should reject creation with a non-existent or inactive subsidiaryId', async () => {
            const nonExistentId = new Types.ObjectId().toHexString();
            const withNonExistentSub: CreateClientDto = { name: 'Fail Sub', subsidiaryId: nonExistentId };
            const withInactiveSub: CreateClientDto = { name: 'Fail Inactive Sub', subsidiaryId: inactiveSubsidiary._id.toString() };

            await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${globalAdminToken}`).send(withNonExistentSub).expect(400);
            await request(app.getHttpServer()).post('/clients').set('Authorization', `Bearer ${globalAdminToken}`).send(withInactiveSub).expect(400);
        });
    });
    
    describe('GET /clients - Retrieval', () => {
        it('should retrieve a single client by ID', async () => {
            const res = await request(app.getHttpServer()).get(`/clients/${testClientA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body.recordId).toBe('CLI_A');
        });

        it('should return 404 for a non-existent client ID', async () => {
            await request(app.getHttpServer()).get(`/clients/${new Types.ObjectId().toHexString()}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(404);
        });
    });

    describe('PATCH /clients/:id - Updates & Business Logic', () => {
        it('should successfully update a client`s name', async () => {
            // 1. Fetch current version
            const current = await request(app.getHttpServer())
                .get(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            const updateDto: UpdateClientDto = { name: 'Updated Name', __v: current.body.__v };
            const res = await request(app.getHttpServer()).patch(`/clients/${testClientA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(200);
            expect(res.body.name).toBe('Updated Name');
            expect(res.body.__v).toBe(current.body.__v + 1);
        });

        it('should throw 409 Conflict when updating with an outdated version', async () => {
            // 1. Fetch current version
            const current = await request(app.getHttpServer())
                .get(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // 2. Simulate a concurrent update (bump version in DB directly)
            await clientModel.updateOne({ _id: testClientA._id }, { $inc: { __v: 1 } });

            // 3. Attempt update with old version
            const updateDto: UpdateClientDto = { name: 'Stale Update', __v: current.body.__v };
            await request(app.getHttpServer())
                .patch(`/clients/${testClientA._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(409);
        });

        it('should FORBID changing the subsidiaryId (Immutability Rule)', async () => {
            // Note: This fails at validation level (DTO strips subsidiaryId), so __v is not strictly required if validation fails first,
            // but good practice to include it if we expect it to reach the service.
            // However, since UpdateClientDto uses OmitType, subsidiaryId is stripped.
            // If we send it, it's ignored or rejected by whitelist.
            // The test expects 400, implying validation failure.
            await request(app.getHttpServer()).patch(`/clients/${testClientA._id}`).set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ subsidiaryId: new Types.ObjectId().toHexString(), __v: 0 })
                .expect(400);
        });

        it('should prevent deactivation if active users or orchards exist', async () => {
            // Test with active user
            const currentA = await request(app.getHttpServer()).get(`/clients/${testClientA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            await request(app.getHttpServer()).patch(`/clients/${testClientA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send({ isActive: false, __v: currentA.body.__v }).expect(409);
            
            // Test with active orchard
            const tempClient = await clientModel.create({ recordId: 'CLI_TEMP', name: 'Temp Client' });
            await orchardModel.create({ recordId: 'ORCH_TEMP', name: 'Temp Orchard', clientId: tempClient._id });
            
            // Since we just created tempClient, __v is 0
            await request(app.getHttpServer()).patch(`/clients/${tempClient._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send({ isActive: false, __v: 0 }).expect(409);
        });
    });

    describe('PUT /clients/:id/users - User Assignment Rules', () => {
        it('should assign a valid subsidiary contact to another client in the same subsidiary', async () => {
            // contactUserSubA is on client A. We are assigning them to client B (which doesn't exist yet, let's create it).
            const clientB = await clientModel.create({recordId: 'CLI_B', name: 'Client B', subsidiaryId: testSubsidiary._id });
            await request(app.getHttpServer()).put(`/clients/${clientB._id}/users`).set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ userIds: [contactUserSubA._id.toString()] }).expect(204);

            const updatedUser = await userModel.findById(contactUserSubA._id);
            expect(updatedUser).not.toBeNull();
            expect(updatedUser!.clientIds.map(id => id.toString())).toContain(clientB._id.toString());
        });

        it('should FORBID assigning a contact from a different subsidiary (Subsidiary Containment Rule)', async () => {
            await request(app.getHttpServer()).put(`/clients/${testClientA._id}/users`).set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ userIds: [contactUserSubB._id.toString()] })
                .expect(400);
        });
    });
    
    describe('DELETE /clients/:id - Deletion & Transactional Integrity', () => {
        it('should successfully soft-delete a client and its dependencies', async () => {
            const tempClient = await clientModel.create({ recordId: 'CLI_DEL', name: 'To Delete' });
            const tempUser = await userModel.create({ recordId: 'USER_DEL', name: 'To Delink', firstName: 'Delink', lastName: 'User', email: 'del@test.com', userType: UserType.CONTACT, roleId: new Types.ObjectId(), clientIds: [tempClient._id] });
            const tempOrchard = await orchardModel.create({ recordId: 'ORCH_DEL', name: 'To Delete', clientId: tempClient._id });

            await request(app.getHttpServer()).delete(`/clients/${tempClient._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);

            const deletedClient = await clientModel.findById(tempClient._id);
            const updatedUser = await userModel.findById(tempUser._id);
            const deletedOrchard = await orchardModel.findById(tempOrchard._id);

            expect(deletedClient!.isDeleted).toBe(true);
            expect(updatedUser!.clientIds).toHaveLength(0);
            expect(deletedOrchard!.isDeleted).toBe(true);
        });

        it('should return 404 when trying to GET a soft-deleted client', async () => {
            const tempClient = await clientModel.create({ recordId: 'CLI_DEL_2', name: 'To Delete 2' });
            await clientModel.updateOne({ _id: tempClient._id }, { isDeleted: true });
            await request(app.getHttpServer()).get(`/clients/${tempClient._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(404);
        });
    });
});