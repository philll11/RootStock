// backend/test/user/user.auth.e2e-spec.ts
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
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';

describe('Users Authorization & Security (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Tokens for different user roles
    let platformAdminToken: string;
    let regionManagerToken: string;
    let farmOwnerToken: string;
    let unauthorizedUserToken: string;

    // Test Data Entities
    let californiaSubsidiary: SubsidiaryDocument, oregonSubsidiary: SubsidiaryDocument;
    let appleOrchardClient: ClientDocument, berryFarmClient: ClientDocument, crossSubsidiaryClient: ClientDocument, independentClient: ClientDocument;
    let globalAdminRole: RoleDocument, subsidiaryManagerRole: RoleDocument, farmOwnerRole: RoleDocument, contactRole: RoleDocument, restrictedRole: RoleDocument;

    // Target users for testing operations
    let caliEmployeeUser: UserDocument, caliContactUser: UserDocument, oregonContactUser: UserDocument, standaloneContactUser: UserDocument;

    jest.setTimeout(60000); // Increased timeout for E2E tests

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        // Setup Subsidiaries
        [californiaSubsidiary, oregonSubsidiary] = await subsidiaryModel.create([
            { recordId: 'SUB_CA', name: 'California Agricultural Solutions' },
            { recordId: 'SUB_OR', name: 'Oregon Fruit Growers Co-op' },
        ]);

        // Setup Clients
        [appleOrchardClient, berryFarmClient, crossSubsidiaryClient, independentClient] = await clientModel.create([
            { recordId: 'CLI_APPLE', name: 'Golden Valley Apple Orchards', subsidiaryId: californiaSubsidiary._id },
            { recordId: 'CLI_BERRY', name: 'Mountain Berry Farms', subsidiaryId: californiaSubsidiary._id },
            { recordId: 'CLI_OREGON', name: 'Pacific Northwest Orchards', subsidiaryId: oregonSubsidiary._id },
            { recordId: 'CLI_INDEPENDENT', name: 'Independent Orchard', subsidiaryId: null },
        ]);

        // Setup Roles
        [globalAdminRole, subsidiaryManagerRole, farmOwnerRole, contactRole, restrictedRole] = await roleModel.create([
            { recordId: 'ROLE_GLOBAL_ADMIN', name: 'Platform Administrator', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_REGION_MGR', name: 'Regional Manager', permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY },
            { recordId: 'ROLE_FARM_OWNER', name: 'Farm Owner', permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT, PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'ROLE_CONTACT', name: 'External Contact', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'ROLE_NO_PERMS', name: 'No Permissions Role', permissions: [], visibilityScope: VisibilityScope.CLIENT },
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    // --- PHASE 1: LAYER 2 - VISIBILITY SCOPE TESTS ---
    describe('Layer 2 - Data Visibility Scope', () => {
        beforeEach(async () => {
            await userModel.deleteMany({});
            const users = await userModel.create([
                // California Subsidiary Users
                { recordId: 'ADMIN_GLOBAL', name: 'Platform Admin', firstName: 'Global', lastName: 'Admin', email: 'admin@rootstock.platform', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id },
                { recordId: 'MGR_CA', name: 'California Manager', firstName: 'Cali', lastName: 'Manager', email: 'manager@ca.com', userType: UserType.EMPLOYEE, roleId: subsidiaryManagerRole._id, clientIds: [appleOrchardClient._id] },
                { recordId: 'OWNER_APPLE', name: 'Apple Farm Owner', firstName: 'Apple', lastName: 'Owner', email: 'owner@apple.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id, clientIds: [appleOrchardClient._id] },
                { recordId: 'CONTACT_BERRY', name: 'Berry Farm Contact', firstName: 'Berry', lastName: 'Contact', email: 'contact@berry.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [berryFarmClient._id] },
                // Oregon Subsidiary User
                { recordId: 'OWNER_OR', name: 'Oregon Farm Owner', firstName: 'Oregon', lastName: 'Owner', email: 'owner@or.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id, clientIds: [crossSubsidiaryClient._id] },
                // User with no permissions for negative testing
                { recordId: 'UNAUTH', name: 'Unauthorized User', firstName: 'No', lastName: 'Perms', email: 'no@perms.com', userType: UserType.EMPLOYEE, roleId: restrictedRole._id, clientIds: [appleOrchardClient._id] }
            ]);

            // Create tokens for each persona
            platformAdminToken = jwtService.sign({ sub: users[0].recordId, tokenVersion: 0 });
            regionManagerToken = jwtService.sign({ sub: users[1].recordId, tokenVersion: 0 });
            farmOwnerToken = jwtService.sign({ sub: users[2].recordId, tokenVersion: 0 });
            unauthorizedUserToken = jwtService.sign({ sub: users[5].recordId, tokenVersion: 0 });
        });

        it('Global Admin should see ALL users across the entire platform', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            expect(res.body.map(u => u.name)).toEqual(expect.arrayContaining(['Platform Admin', 'California Manager', 'Apple Farm Owner', 'Berry Farm Contact', 'Oregon Farm Owner']));
            expect(res.body).toHaveLength(6);
        });

        it('Subsidiary Manager should see only users within their subsidiary', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${regionManagerToken}`).expect(200);
            expect(res.body.map(u => u.name)).toEqual(expect.arrayContaining(['California Manager', 'Apple Farm Owner', 'Berry Farm Contact', 'Unauthorized User']));
            expect(res.body.map(u => u.name)).not.toContain('Oregon Farm Owner');
            expect(res.body).toHaveLength(4);
        });

        it('Client Owner should see only users assigned to their specific client', async () => {
            const res = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${farmOwnerToken}`).expect(200);
            expect(res.body.map(u => u.name)).toEqual(expect.arrayContaining(['California Manager', 'Apple Farm Owner', 'Unauthorized User']));
            expect(res.body.map(u => u.name)).not.toContain('Berry Farm Contact');
            expect(res.body).toHaveLength(3);
        });

        it('should return 403 Forbidden for a user with no USER_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${unauthorizedUserToken}`).expect(403);
        });
    });

    // --- PHASE 2: LAYER 1 & 3 - ACTION AUTHORIZATION AND BUSINESS RULES ---
    describe('Layer 1 & 3 - Actions and Business Rules (Write)', () => {
        beforeEach(async () => {
            await userModel.deleteMany({});
            const users = await userModel.create([
                { recordId: 'ADMIN_GLOBAL', name: 'Platform Admin', firstName: 'Global', lastName: 'Admin', email: 'admin@rootstock.platform', userType: UserType.EMPLOYEE, roleId: globalAdminRole._id },
                { recordId: 'MGR_CA', name: 'California Manager', firstName: 'Cali', lastName: 'Manager', email: 'manager@ca.com', userType: UserType.EMPLOYEE, roleId: subsidiaryManagerRole._id, clientIds: [appleOrchardClient._id] },
                { recordId: 'OWNER_APPLE', name: 'Apple Farm Owner', firstName: 'Apple', lastName: 'Owner', email: 'owner@apple.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id, clientIds: [appleOrchardClient._id] },
            ]);
            [caliEmployeeUser, caliContactUser, standaloneContactUser] = await userModel.create([
                { recordId: 'EMP_CA', name: 'Cali Employee', firstName: 'Cali', lastName: 'Emp', email: 'emp@ca.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id, clientIds: [appleOrchardClient._id] },
                { recordId: 'CONTACT_CA', name: 'Cali Contact', firstName: 'Cali', lastName: 'Contact', email: 'contact@ca.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [appleOrchardClient._id] },
                { recordId: 'CONTACT_STANDALONE', name: 'Standalone Contact', firstName: 'Stand', lastName: 'Alone', email: 'standalone@contact.com', userType: UserType.CONTACT, roleId: contactRole._id, clientIds: [independentClient._id] },
            ]);
            platformAdminToken = jwtService.sign({ sub: users[0].recordId, tokenVersion: 0 });
            regionManagerToken = jwtService.sign({ sub: users[1].recordId, tokenVersion: 0 });
            farmOwnerToken = jwtService.sign({ sub: users[2].recordId, tokenVersion: 0 });
        });

        // --- CREATE Operation Tests ---
        describe('POST /users', () => {
            // Admin user
            it('should allow an admin to create a "contact" user and assign them to a subsidiary client', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ firstName: 'New', lastName: 'Contact', email: 'new@contact.com', userType: UserType.CONTACT, roleId: contactRole._id.toString(), clientIds: [appleOrchardClient._id.toString()] })
                    .expect(201);
            });
            it('should allow an admin to create a "contact" user and assign them to a standalone client', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ firstName: 'New', lastName: 'Contact', email: 'new@contact.com', userType: UserType.CONTACT, roleId: contactRole._id.toString(), clientIds: [independentClient._id.toString()] })
                    .expect(201);
            });
            it('should FORBID creating a "contact" user without a client assignment (Layer 3)', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ firstName: 'New', lastName: 'Contact', email: 'new@contact.com', userType: UserType.CONTACT, roleId: contactRole._id.toString() })
                    .expect(400);
            });

            // Region Manager user
            it('should allow a user with USER_CREATE to create a user', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ firstName: 'New', lastName: 'Hire', email: 'new@ca.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id.toString(), clientIds: [berryFarmClient._id.toString()] })
                    .expect(201);
            });
            it('should FORBID creating a user in a client outside the creator`s scope (Layer 2)', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ firstName: 'New', lastName: 'Hire', email: 'new@or.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id.toString(), clientIds: [crossSubsidiaryClient._id.toString()] })
                    .expect(403);
            });
            it('should FORBID creating a "contact" user in a standalone client outside the creator`s scope (Layer 2)', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${regionManagerToken}`)
                    .send({ firstName: 'New', lastName: 'Hire', email: 'new@or.com', userType: UserType.CONTACT, roleId: contactRole._id.toString(), clientIds: [independentClient._id.toString()] })
                    .expect(403);
            });

            // Farm Owner user
            it('should FORBID a user without USER_CREATE permission (Layer 1)', async () => {
                await request(app.getHttpServer()).post('/users').set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ firstName: 'New', lastName: 'Hire', email: 'new@ca.com', userType: UserType.EMPLOYEE, roleId: farmOwnerRole._id.toString(), clientIds: [appleOrchardClient._id.toString()] })
                    .expect(403);
            });
        });

        // --- Layer 3 Subsidiary Containment Tests ---
        describe('PATCH /users/:id - Subsidiary Containment Rules', () => {
            it('should allow assigning a CONTACT to another client WITHIN the same subsidiary', async () => {
                await request(app.getHttpServer()).patch(`/users/${caliContactUser.id}`).set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ clientIds: [appleOrchardClient._id.toString(), berryFarmClient._id.toString()] })
                    .expect(200);
            });
            it('should FORBID assigning a CONTACT to a client in a DIFFERENT subsidiary (Layer 3)', async () => {
                await request(app.getHttpServer()).patch(`/users/${caliContactUser.id}`).set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ clientIds: [appleOrchardClient._id.toString(), crossSubsidiaryClient._id.toString()] })
                    .expect(400);
            });
            it('should FORBID re-assigning a subsidiary-based CONTACT to a standalone client (Layer 3)', async () => {
                // Take a contact from Subsidiary A and try to move them to the independent client.
                await request(app.getHttpServer())
                    .patch(`/users/${caliContactUser.id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ clientIds: [independentClient._id.toString()] })
                    .expect(400); // Bad Request, violates the data silo rule
            });

            it('should FORBID re-assigning a standalone CONTACT to a subsidiary-based client (Layer 3)', async () => {
                // Take the contact from the independent client and try to move them to a client in Subsidiary A.
                await request(app.getHttpServer())
                    .patch(`/users/${standaloneContactUser.id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ clientIds: [appleOrchardClient._id.toString()] })
                    .expect(400); // Bad Request, violates the data silo rule
            });
        });

        // --- General UPDATE Operation Tests ---
        describe('PATCH /users/:id - General Permissions', () => {
            it('should allow a user with USER_EDIT to update a user within their scope', async () => {
                await request(app.getHttpServer()).patch(`/users/${caliEmployeeUser.id}`).set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ firstName: "Updated" })
                    .expect(200);
            });
            it('should FORBID a user without USER_EDIT from updating a user (Layer 1)', async () => {
                // We need a user with USER_VIEW but not USER_EDIT to test this properly. Let's create one.
                const viewOnlyRole = await roleModel.create({ recordId: 'VIEW_ONLY', name: 'View Only', permissions: [PERMISSIONS.USER_VIEW], visibilityScope: VisibilityScope.CLIENT });
                const viewOnlyUser = await userModel.create({ recordId: 'VIEW_ONLY', name: 'Viewer', firstName: 'View', lastName: 'Only', email: 'view@only.com', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id, clientIds: [appleOrchardClient._id] });
                const viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId, tokenVersion: 0 });

                await request(app.getHttpServer()).patch(`/users/${caliEmployeeUser.id}`).set('Authorization', `Bearer ${viewOnlyToken}`)
                    .send({ firstName: "ShouldFail" })
                    .expect(403);
            });
        });

        // --- DELETE Operation Tests ---
        describe('DELETE /users/:id', () => {
            it('should allow a user with USER_DELETE to delete a user within their scope', async () => {
                await request(app.getHttpServer()).delete(`/users/${caliEmployeeUser.id}`).set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200);
                const user = await userModel.findById(caliEmployeeUser.id);
                expect(user).not.toBeNull();
                expect(user!.isDeleted).toBe(true);
            });
            it('should FORBID a user without USER_DELETE from deleting a user (Layer 1)', async () => {
                await request(app.getHttpServer()).delete(`/users/${caliEmployeeUser.id}`).set('Authorization', `Bearer ${regionManagerToken}`)
                    .expect(403);
                const user = await userModel.findById(caliEmployeeUser.id);
                expect(user).not.toBeNull();
                expect(user!.isDeleted).toBe(false);

            });
        });
    });
});