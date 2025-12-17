// backend/test/subsidiary/subsidiary.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { CreateUserDto } from '../../src/iam/users/dto/create-user.dto';
import { UpdateUserDto } from '../../src/iam/users/dto/update-user.dto';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';

describe('Users CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;
    
    // Models
    let userModel: Model<UserDocument>;
    
    // Tokens
    let globalAdminToken: string;
    let selfUpdatingContactToken: string;

    // Test Data Entities
    let testClientA: ClientDocument, testClientB: ClientDocument, inactiveClient: ClientDocument;
    let employeeRole: RoleDocument, contactRole: RoleDocument;
    let selfUpdatingContactUser: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));

        [testClientA, testClientB, inactiveClient] = await clientModel.create([
            { recordId: 'CLI_CRUD_A', name: 'CRUD Client A' },
            { recordId: 'CLI_CRUD_B', name: 'CRUD Client B' },
            { recordId: 'CLI_CRUD_INACTIVE', name: 'CRUD Inactive Client', isActive: false },
        ]);

        [employeeRole, contactRole] = await roleModel.create([
            { recordId: 'EMP_ROLE', name: 'Employee Role', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'CONT_ROLE', name: 'Contact Role', permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT], visibilityScope: VisibilityScope.CLIENT },
        ]);

        const globalAdmin = await userModel.create({ recordId: 'ADMIN_CRUD', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin_crud@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id });
        selfUpdatingContactUser = await userModel.create({ recordId: 'CONTACT_SELF_UPDATE', name: 'Self Updater', firstName: 'Self', lastName: 'Updater', email: 'self@update.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [testClientA._id] });
        
        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });
        selfUpdatingContactToken = jwtService.sign({ sub: selfUpdatingContactUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => {
        // Clean up users created during tests, preserving the main admin and contact
        await userModel.deleteMany({ recordId: { $nin: ['ADMIN_CRUD', 'CONTACT_SELF_UPDATE'] } });
    });

    describe('POST /users - Creation & Validation', () => {
        it('should successfully create an employee and a contact user', async () => {
            const employeeDto: CreateUserDto = { firstName: 'New', lastName: 'Employee', email: 'employee@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id.toString() };
            const contactDto: CreateUserDto = { firstName: 'New', lastName: 'Contact', email: 'contact@test.com', userType: UserType.CONTACT, roleId: contactRole._id.toString(), clientIds: [testClientA._id.toString()] };
            
            const empRes = await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(employeeDto).expect(201);
            expect(empRes.body.name).toBe('New Employee');
            expect(empRes.body.recordId).toMatch(/^USR\d{4}$/);

            const contactRes = await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(contactDto).expect(201);
            expect(contactRes.body.name).toBe('New Contact');
            expect(contactRes.body.clientIds).toContain(testClientA._id.toString());
        });

        it('should reject creation with a duplicate email', async () => {
            const dto: CreateUserDto = { firstName: 'Duplicate', lastName: 'Email', email: 'admin_crud@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id.toString() };
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(dto).expect(409); // 409 Conflict
        });

        it('should reject creation if a required field is missing', async () => {
            const dto: Partial<CreateUserDto> = { firstName: 'Test', lastName: 'User', userType: UserType.EMPLOYEE }; // Missing email and roleId
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(dto).expect(400);
        });

        it('should reject creation if assigning a non-existent role or client', async () => {
            const nonExistentId = new Types.ObjectId().toHexString();
            const invalidRoleDto: CreateUserDto = { firstName: 'Invalid', lastName: 'Role', email: 'role@fail.com', userType: UserType.EMPLOYEE, roleId: nonExistentId };
            const invalidClientDto: CreateUserDto = { firstName: 'Invalid', lastName: 'Client', email: 'client@fail.com', userType: UserType.CONTACT, roleId: contactRole._id.toString(), clientIds: [nonExistentId] };
            
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(invalidRoleDto).expect(400);
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(invalidClientDto).expect(400);
        });

        it('should reject creation of a CONTACT user with no clientIds', async () => {
            const dto: CreateUserDto = { firstName: 'No', lastName: 'Client', email: 'noclient@fail.com', userType: UserType.CONTACT, roleId: contactRole._id.toString() };
            await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${globalAdminToken}`).send(dto).expect(400);
        });
    });

    describe('GET /users - Retrieval & Filtering', () => {
        let userA: UserDocument;
        beforeEach(async () => {
            [userA] = await userModel.create([{ recordId: 'USER_A_GET', name: 'User A', firstName: 'A', lastName: 'User', email: 'a@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id, clientIds: [testClientA._id] }]);
        });

        it('should retrieve a single user by ID (Happy Path)', async () => {
            const res = await request(app.getHttpServer()).get(`/users/${userA._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body.recordId).toBe('USER_A_GET');
        });

        it('should filter users by userType', async () => {
            const res = await request(app.getHttpServer()).get('/users?userType=contact').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            expect(res.body.every(user => user.userType === 'contact')).toBe(true);
            expect(res.body.map(u => u.recordId)).toContain('CONTACT_SELF_UPDATE');
        });
    });

    describe('PATCH /users/:id - Updates & Business Logic', () => {
        let testUser: UserDocument;
        beforeEach(async () => {
            testUser = await userModel.create({ recordId: 'USER_PATCH', name: 'To Patch', firstName: 'To', lastName: 'Patch', email: 'patch@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id, clientIds: [testClientA._id] });
        });

        it('should successfully update a user`s name, role, and clients (Happy Path)', async () => {
            const updateDto: UpdateUserDto = { firstName: 'Patched', lastName: 'User', roleId: contactRole._id.toString(), clientIds: [testClientB._id.toString()] };
            const res = await request(app.getHttpServer()).patch(`/users/${testUser._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(200);
            expect(res.body.name).toBe('Patched User');
            expect(res.body.roleId).toBe(contactRole._id.toString());
            expect(res.body.clientIds).toContain(testClientB._id.toString());
        });

        it('should allow a CONTACT user with USER_EDIT to update their OWN personal info', async () => {
            const updateDto: UpdateUserDto = { firstName: 'Self', lastName: 'Updated' };
            const res = await request(app.getHttpServer()).patch(`/users/${selfUpdatingContactUser._id}`).set('Authorization', `Bearer ${selfUpdatingContactToken}`).send(updateDto).expect(200);
            expect(res.body.name).toBe('Self Updated');
        });

        it('should FORBID a CONTACT user from updating fields other than personal info', async () => {
            // This test requires a contact user WITHOUT USER_EDIT permission.
            const restrictedRole = await app.get<Model<RoleDocument>>(getModelToken(Role.name)).create({ recordId: 'RESTRICTED', name: 'Restricted Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT });
            const restrictedContact = await userModel.create({ recordId: 'RESTRICTED_PATCH', name: 'Restricted', firstName: 'Restricted', lastName: 'User', email: 'restricted@patch.com', userType: UserType.CONTACT, roleId: restrictedRole._id, clientIds: [testClientA._id] });
            const restrictedToken = jwtService.sign({ sub: restrictedContact.recordId, tokenVersion: 0 });

            const updateDto: UpdateUserDto = { roleId: employeeRole._id.toString() };
            await request(app.getHttpServer()).patch(`/users/${restrictedContact._id}`).set('Authorization', `Bearer ${restrictedToken}`).send(updateDto).expect(403);
        });

        it('should FORBID a CONTACT user from updating ANOTHER user', async () => {
            // This test also requires a contact user WITHOUT USER_EDIT permission.
            const restrictedRole = await app.get<Model<RoleDocument>>(getModelToken(Role.name)).create({ recordId: 'RESTRICTED_2', name: 'Restricted Contact 2', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT });
            const restrictedContact = await userModel.create({ recordId: 'RESTRICTED_PATCH_2', name: 'Restricted 2', firstName: 'Restricted', lastName: 'User 2', email: 'restricted2@patch.com', userType: UserType.CONTACT, roleId: restrictedRole._id, clientIds: [testClientA._id] });
            const restrictedToken = jwtService.sign({ sub: restrictedContact.recordId, tokenVersion: 0 });

            const updateDto: UpdateUserDto = { firstName: 'Should Fail' };
            await request(app.getHttpServer()).patch(`/users/${testUser._id}`).set('Authorization', `Bearer ${restrictedToken}`).send(updateDto).expect(403);
        });
    });

    describe('DELETE /users/:id - Deletion', () => {
        let testUser: UserDocument;
        beforeEach(async () => {
            testUser = await userModel.create({ recordId: 'USER_DELETE', name: 'To Delete', firstName: 'To', lastName: 'Delete', email: 'delete@test.com', userType: UserType.EMPLOYEE, roleId: employeeRole._id });
        });
        
        it('should successfully soft-delete a user (Happy Path)', async () => {
            await request(app.getHttpServer()).delete(`/users/${testUser._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
            const deleted = await userModel.findById(testUser._id);
            expect(deleted?.isDeleted).toBe(true);
        });

        it('should return 404 when trying to GET a soft-deleted user', async () => {
            await userModel.updateOne({ _id: testUser._id }, { isDeleted: true });
            await request(app.getHttpServer()).get(`/users/${testUser._id}`).set('Authorization', `Bearer ${globalAdminToken}`).expect(404);
        });
    });
});