import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';

describe('Users Authorization & Multi-Tenant Security - Agricultural Business Scenarios (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let orchardModel: Model<any>;

    // Agricultural Business Test Data - Real stakeholders
    let platformAdminToken: string; // Global platform administrator
    let regionManagerToken: string; // Regional subsidiary manager
    let farmOwnerToken: string; // Individual farm owner/grower
    let consultantToken: string; // Agricultural consultant
    let fieldWorkerToken: string; // Farm worker with limited access
    let contactUserToken: string; // External contact with restricted access
    let unauthorizedUserToken: string; // User with no relevant permissions

    // Business entities representing real agricultural operations
    let californiaSubsidiary: SubsidiaryDocument;
    let oregonSubsidiary: SubsidiaryDocument;
    let inactiveSubsidiary: SubsidiaryDocument;
    let appleOrchardClient: ClientDocument;
    let berryFarmClient: ClientDocument;
    let independentGrowerClient: ClientDocument;
    let crossSubsidiaryClient: ClientDocument;

    // Business roles for agricultural hierarchy
    let globalAdminRole: RoleDocument;
    let subsidiaryManagerRole: RoleDocument;
    let farmOwnerRole: RoleDocument;
    let consultantRole: RoleDocument;
    let fieldWorkerRole: RoleDocument;
    let contactRole: RoleDocument;
    let restrictedRole: RoleDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        orchardModel = app.get<Model<any>>(getModelToken('Orchard'));

        // Create agricultural business entities
        californiaSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_CA',
            name: 'California Agricultural Solutions',
            isActive: true
        }).save();

        oregonSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_OR',
            name: 'Oregon Fruit Growers Co-op',
            isActive: true
        }).save();

        inactiveSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_INACTIVE',
            name: 'Closed Agricultural Corp',
            isActive: false
        }).save();

        // Create diverse agricultural clients
        appleOrchardClient = await new clientModel({
            recordId: 'CLI_APPLE',
            name: 'Golden Valley Apple Orchards',
            subsidiaryId: californiaSubsidiary._id,
            isActive: true
        }).save();

        berryFarmClient = await new clientModel({
            recordId: 'CLI_BERRY',
            name: 'Mountain Berry Farms',
            subsidiaryId: californiaSubsidiary._id,
            isActive: true
        }).save();

        independentGrowerClient = await new clientModel({
            recordId: 'CLI_INDEPENDENT',
            name: 'Independent Family Orchard',
            // No subsidiary - independent operation
            isActive: true
        }).save();

        crossSubsidiaryClient = await new clientModel({
            recordId: 'CLI_OREGON',
            name: 'Pacific Northwest Orchards',
            subsidiaryId: oregonSubsidiary._id,
            isActive: true
        }).save();

        // Create realistic agricultural business roles
        globalAdminRole = await new roleModel({
            recordId: 'ROLE_GLOBAL_ADMIN',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        subsidiaryManagerRole = await new roleModel({
            recordId: 'ROLE_REGION_MGR',
            name: 'Regional Agricultural Manager',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE,
                PERMISSIONS.USER_EDIT,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_CREATE,
                // Note: No USER_DELETE permission - business rule
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        farmOwnerRole = await new roleModel({
            recordId: 'ROLE_FARM_OWNER',
            name: 'Farm Owner/Grower',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_EDIT, // Can manage own farm staff
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT,
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        consultantRole = await new roleModel({
            recordId: 'ROLE_CONSULTANT',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // Note: No edit permissions - consultants are read-only
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        fieldWorkerRole = await new roleModel({
            recordId: 'ROLE_FIELD_WORKER',
            name: 'Farm Field Worker',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // Limited permissions for field operations
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        contactRole = await new roleModel({
            recordId: 'ROLE_CONTACT',
            name: 'External Contact',
            permissions: [
                PERMISSIONS.USER_VIEW, // Can view basic user info
                // Very limited permissions for external contacts
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        restrictedRole = await new roleModel({
            recordId: 'ROLE_NO_PERMS',
            name: 'No Permissions Role',
            permissions: [], // No permissions whatsoever
            visibilityScope: VisibilityScope.CLIENT
        }).save();
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('Multi-Tenant Data Visibility - Agricultural Business Security', () => {
        beforeEach(async () => {
            // Clean slate for each test
            await userModel.deleteMany({});

            // Create users representing real agricultural stakeholders
            const platformAdmin = await new userModel({
                recordId: 'ADMIN_GLOBAL',
                name: 'Platform Administrator',
                firstName: 'Global',
                lastName: 'Admin',
                email: 'admin@rootstock.platform',
                userType: UserType.EMPLOYEE,
                roleId: globalAdminRole._id,
                isActive: true
            }).save();
            platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

            const regionManager = await new userModel({
                recordId: 'MGR_CALIFORNIA',
                name: 'California Regional Manager',
                firstName: 'Regional',
                lastName: 'Manager',
                email: 'manager@california-ag.com',
                userType: UserType.EMPLOYEE,
                roleId: subsidiaryManagerRole._id,
                clientIds: [appleOrchardClient._id, berryFarmClient._id],
                isActive: true
            }).save();
            regionManagerToken = jwtService.sign({ sub: regionManager.recordId });

            const farmOwner = await new userModel({
                recordId: 'OWNER_APPLE',
                name: 'Apple Orchard Owner',
                firstName: 'Farm',
                lastName: 'Owner',
                email: 'owner@goldenvalley.com',
                userType: UserType.EMPLOYEE,
                roleId: farmOwnerRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            farmOwnerToken = jwtService.sign({ sub: farmOwner.recordId });

            const consultant = await new userModel({
                recordId: 'CONSULTANT_AG',
                name: 'Agricultural Consultant',
                firstName: 'Ag',
                lastName: 'Consultant',
                email: 'consultant@agservices.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id,
                clientIds: [appleOrchardClient._id, berryFarmClient._id],
                isActive: true
            }).save();
            consultantToken = jwtService.sign({ sub: consultant.recordId });

            const fieldWorker = await new userModel({
                recordId: 'WORKER_FIELD',
                name: 'Field Worker',
                firstName: 'Field',
                lastName: 'Worker',
                email: 'worker@goldenvalley.com',
                userType: UserType.EMPLOYEE,
                roleId: fieldWorkerRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });

            const contactUser = await new userModel({
                recordId: 'CONTACT_EXT',
                name: 'External Contact',
                firstName: 'External',
                lastName: 'Contact',
                email: 'contact@supplier.com',
                userType: UserType.CONTACT,
                roleId: contactRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            contactUserToken = jwtService.sign({ sub: contactUser.recordId });

            const unauthorizedUser = await new userModel({
                recordId: 'USER_NO_PERMS',
                name: 'Unauthorized User',
                firstName: 'No',
                lastName: 'Permissions',
                email: 'noperms@test.com',
                userType: UserType.EMPLOYEE,
                roleId: restrictedRole._id,
                clientIds: [independentGrowerClient._id],
                isActive: true
            }).save();
            unauthorizedUserToken = jwtService.sign({ sub: unauthorizedUser.recordId });

            // Create cross-subsidiary users to test isolation
            await new userModel({
                recordId: 'USER_OREGON_1',
                name: 'Oregon User 1',
                firstName: 'Oregon',
                lastName: 'User1',
                email: 'user1@oregon-growers.com',
                userType: UserType.EMPLOYEE,
                roleId: farmOwnerRole._id,
                clientIds: [crossSubsidiaryClient._id],
                isActive: true
            }).save();

            await new userModel({
                recordId: 'USER_BERRY_FARM',
                name: 'Berry Farm Manager',
                firstName: 'Berry',
                lastName: 'Manager',
                email: 'manager@berryforms.com',
                userType: UserType.EMPLOYEE,
                roleId: farmOwnerRole._id,
                clientIds: [berryFarmClient._id],
                isActive: true
            }).save();

            await new userModel({
                recordId: 'CONTACT_INDEPENDENT',
                name: 'Independent Contact',
                firstName: 'Independent',
                lastName: 'Contact',
                email: 'contact@independent.com',
                userType: UserType.CONTACT,
                roleId: contactRole._id,
                clientIds: [independentGrowerClient._id],
                isActive: true
            }).save();
        });

        it('should allow Global Admin to see ALL users across the entire platform', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(res.body).toHaveLength(10); // All users created in beforeEach
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'Platform Administrator',
                'California Regional Manager', 
                'Apple Orchard Owner',
                'Agricultural Consultant',
                'Field Worker',
                'External Contact',
                'Unauthorized User',
                'Oregon User 1',
                'Berry Farm Manager',
                'Independent Contact'
            ]));
        });

        it('should restrict Regional Manager to users within their subsidiary scope', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${regionManagerToken}`)
                .expect(200);

            // Should see users from California subsidiary clients only (6 users total)
            // Regional Manager has access to both Apple and Berry clients in California subsidiary
            expect(res.body).toHaveLength(6);
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'California Regional Manager', // Self
                'Apple Orchard Owner', // Same subsidiary
                'Agricultural Consultant', // Same subsidiary  
                'Field Worker', // Same subsidiary
                'External Contact', // Same subsidiary
                'Berry Farm Manager' // Same subsidiary
            ]));

            // Should NOT see Oregon users or independent users
            expect(userNames).not.toContain('Oregon User 1');
            expect(userNames).not.toContain('Independent Contact');
        });

        it('should restrict Farm Owner to users within their client scope only', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${farmOwnerToken}`)
                .expect(200);

            // Should only see users associated with Apple Orchard client (5 users)
            // Farm Owner only has access to Apple Orchard client, but Regional Manager also has access
            expect(res.body).toHaveLength(5);
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'California Regional Manager', // Has access to apple orchard 
                'Apple Orchard Owner', // Self
                'Agricultural Consultant', // Has access to apple orchard
                'Field Worker', // Works at apple orchard
                'External Contact', // Contact for apple orchard
            ]));

            // Should NOT see users from other clients
            expect(userNames).not.toContain('Berry Farm Manager');
            expect(userNames).not.toContain('Oregon User 1');
        });

        it('should restrict Agricultural Consultant to their assigned subsidiary clients', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${consultantToken}`)
                .expect(200);

            // Consultant has access to multiple clients in California subsidiary (6 users)
            expect(res.body).toHaveLength(6);
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'California Regional Manager', // Same subsidiary
                'Agricultural Consultant', // Self
                'Apple Orchard Owner', // Client A access
                'Field Worker', // Client A access
                'External Contact', // Client A access
                'Berry Farm Manager' // Client B access
            ]));
        });

        it('should restrict Field Worker to their specific client only', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${fieldWorkerToken}`)
                .expect(200);

            // Field worker only sees users from their specific farm (5 users)
            expect(res.body).toHaveLength(5);
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'California Regional Manager', // Has access to same client
                'Field Worker', // Self
                'Apple Orchard Owner', // Same client
                'Agricultural Consultant', // Has access to same client
                'External Contact' // Same client contact
            ]));

            expect(userNames).not.toContain('Berry Farm Manager');
        });

        it('should restrict CONTACT user to minimal visibility within their client', async () => {
            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${contactUserToken}`)
                .expect(200);

            // Contact users should have very limited visibility (5 users)
            expect(res.body).toHaveLength(5);
            
            const userNames = res.body.map(u => u.name);
            expect(userNames).toEqual(expect.arrayContaining([
                'California Regional Manager', // Has access to same client
                'External Contact', // Self
                'Apple Orchard Owner', // Same client
                'Agricultural Consultant', // Same client
                'Field Worker' // Same client
            ]));
        });

        it('should deny access to users with no USER_VIEW permission', async () => {
            await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                .expect(403);
        });

        it('should enforce client isolation between different subsidiaries', async () => {
            // Create a token for Oregon user
            const oregonUser = await userModel.findOne({ recordId: 'USER_OREGON_1' });
            const oregonToken = jwtService.sign({ sub: oregonUser!.recordId });

            const res = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${oregonToken}`)
                .expect(200);

            // Oregon user should only see themselves (no other users in their scope)
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Oregon User 1');

            // Should NOT see California subsidiary users
            const userNames = res.body.map(u => u.name);
            expect(userNames).not.toContain('Apple Orchard Owner');
            expect(userNames).not.toContain('Berry Farm Manager');
        });
    });

    describe('Permission-Based Action Authorization - Agricultural Business Rules', () => {
        let testTargetUser: UserDocument;
        let contactTestUser: UserDocument;

        beforeEach(async () => {
            // Clean slate for permission testing
            await userModel.deleteMany({});

            // Create test target users for action testing
            testTargetUser = await new userModel({
                recordId: 'TARGET_USER',
                name: 'Target Test User',
                firstName: 'Target',
                lastName: 'User',
                email: 'target@test.com',
                userType: UserType.EMPLOYEE,
                roleId: farmOwnerRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();

            contactTestUser = await new userModel({
                recordId: 'TARGET_CONTACT',
                name: 'Target Contact User',
                firstName: 'Target',
                lastName: 'Contact',
                email: 'contact@test.com',
                userType: UserType.CONTACT,
                roleId: contactRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();

            // Create action test users
            const platformAdmin = await new userModel({
                recordId: 'ADMIN_ACTIONS',
                name: 'Admin for Actions',
                firstName: 'Admin',
                lastName: 'Actions',
                email: 'admin@platform.com',
                userType: UserType.EMPLOYEE,
                roleId: globalAdminRole._id,
                isActive: true
            }).save();
            platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

            const regionManager = await new userModel({
                recordId: 'MGR_ACTIONS',
                name: 'Manager for Actions',
                firstName: 'Manager',
                lastName: 'Actions',
                email: 'manager@region.com',
                userType: UserType.EMPLOYEE,
                roleId: subsidiaryManagerRole._id,
                clientIds: [appleOrchardClient._id, berryFarmClient._id],
                isActive: true
            }).save();
            regionManagerToken = jwtService.sign({ sub: regionManager.recordId });

            const farmOwner = await new userModel({
                recordId: 'OWNER_ACTIONS',
                name: 'Owner for Actions',
                firstName: 'Owner',
                lastName: 'Actions',
                email: 'owner@farm.com',
                userType: UserType.EMPLOYEE,
                roleId: farmOwnerRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            farmOwnerToken = jwtService.sign({ sub: farmOwner.recordId });

            const consultant = await new userModel({
                recordId: 'CONSULTANT_ACTIONS',
                name: 'Consultant for Actions',
                firstName: 'Consultant',
                lastName: 'Actions',
                email: 'consultant@services.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            consultantToken = jwtService.sign({ sub: consultant.recordId });

            const fieldWorker = await new userModel({
                recordId: 'WORKER_ACTIONS',
                name: 'Worker for Actions',
                firstName: 'Worker',
                lastName: 'Actions',
                email: 'worker@farm.com',
                userType: UserType.EMPLOYEE,
                roleId: fieldWorkerRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });

            const contactUser = await new userModel({
                recordId: 'CONTACT_ACTIONS',
                name: 'Contact for Actions',
                firstName: 'Contact',
                lastName: 'Actions',
                email: 'contact@external.com',
                userType: UserType.CONTACT,
                roleId: contactRole._id,
                clientIds: [appleOrchardClient._id],
                isActive: true
            }).save();
            contactUserToken = jwtService.sign({ sub: contactUser.recordId });

            const unauthorizedUser = await new userModel({
                recordId: 'UNAUTH_ACTIONS',
                name: 'Unauthorized for Actions',
                firstName: 'Unauthorized',
                lastName: 'Actions',
                email: 'unauth@test.com',
                userType: UserType.EMPLOYEE,
                roleId: restrictedRole._id,
                clientIds: [independentGrowerClient._id],
                isActive: true
            }).save();
            unauthorizedUserToken = jwtService.sign({ sub: unauthorizedUser.recordId });
        });

        describe('POST /users - User Creation Authorization', () => {
            it('should allow Global Admin to create any type of user', async () => {
                const newUserData = {
                    firstName: 'New',
                    lastName: 'Employee',
                    email: 'new@employee.com',
                    userType: UserType.EMPLOYEE,
                    clientIds: [appleOrchardClient._id]
                };

                const res = await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(newUserData)
                    .expect(201);

                expect(res.body.recordId).toMatch(/^USR\d{4,}$/);
                expect(res.body.userType).toBe(UserType.EMPLOYEE);
            });

            it('should allow Regional Manager to create users within their subsidiary scope', async () => {
                const newUserData = {
                    firstName: 'New',
                    lastName: 'Worker',
                    email: 'new@worker.com',
                    userType: UserType.EMPLOYEE,
                    clientIds: [appleOrchardClient._id] // Within manager's scope
                };

                await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${regionManagerToken}`)
                    .send(newUserData)
                    .expect(201);
            });

            it('should deny user creation for Farm Owner (lacks USER_CREATE permission)', async () => {
                const newUserData = {
                    firstName: 'Denied',
                    lastName: 'User',
                    email: 'denied@test.com',
                    userType: UserType.EMPLOYEE,
                    clientIds: [appleOrchardClient._id]
                };

                await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send(newUserData)
                    .expect(403);
            });

            it('should deny user creation for Consultant (read-only access)', async () => {
                const newUserData = {
                    firstName: 'Denied',
                    lastName: 'Consultant',
                    email: 'denied@consultant.com',
                    userType: UserType.CONTACT
                };

                await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send(newUserData)
                    .expect(403);
            });

            it('should deny user creation for CONTACT user', async () => {
                const newUserData = {
                    firstName: 'Denied',
                    lastName: 'Contact',
                    email: 'denied@contact.com',
                    userType: UserType.CONTACT
                };

                await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(newUserData)
                    .expect(403);
            });
        });

        describe('PATCH /users/:id - User Update Authorization', () => {
            it('should allow Global Admin to update any user', async () => {
                const updateData = {
                    firstName: 'Updated',
                    lastName: 'AdminUser'
                };

                const res = await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(updateData)
                    .expect(200);

                expect(res.body.firstName).toBe('Updated');
                expect(res.body.lastName).toBe('AdminUser');
            });

            it('should allow Regional Manager to update users within their scope', async () => {
                const updateData = {
                    firstName: 'Updated',
                    lastName: 'ByManager'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${regionManagerToken}`)
                    .send(updateData)
                    .expect(200);
            });

            it('should allow Farm Owner to update users within their client', async () => {
                const updateData = {
                    firstName: 'Updated',
                    lastName: 'ByOwner'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send(updateData)
                    .expect(200);
            });

            it('should deny user updates for Consultant (lacks USER_EDIT permission)', async () => {
                const updateData = {
                    firstName: 'Denied',
                    lastName: 'Update'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send(updateData)
                    .expect(403);
            });

            it('should deny user updates for Field Worker (lacks USER_EDIT permission)', async () => {
                const updateData = {
                    firstName: 'Denied',
                    lastName: 'Worker'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .send(updateData)
                    .expect(403);
            });

            it('should deny CONTACT user from updating other users', async () => {
                const updateData = {
                    firstName: 'Denied',
                    lastName: 'Contact'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403);
            });

            it('should deny updates from users with no permissions', async () => {
                const updateData = {
                    firstName: 'Denied',
                    lastName: 'NoPerms'
                };

                await request(app.getHttpServer())
                    .patch(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                    .send(updateData)
                    .expect(403);
            });
        });

        describe('DELETE /users/:id - User Deletion Authorization', () => {
            it('should allow Global Admin to delete any user', async () => {
                await request(app.getHttpServer())
                    .delete(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200);

                // Verify user is soft deleted (isDeleted = true, isActive = false)
                const deletedUser = await userModel.findById(testTargetUser._id);
                expect(deletedUser).not.toBeNull();
                expect(deletedUser!.isDeleted).toBe(true);
                expect(deletedUser!.isActive).toBe(false);
            });

            it('should deny user deletion for Regional Manager (lacks USER_DELETE permission)', async () => {
                await request(app.getHttpServer())
                    .delete(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${regionManagerToken}`)
                    .expect(403);

                // Verify user still exists
                const existingUser = await userModel.findById(testTargetUser._id);
                expect(existingUser).not.toBeNull();
            });

            it('should deny user deletion for Farm Owner', async () => {
                await request(app.getHttpServer())
                    .delete(`/users/${testTargetUser._id}`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`)
                    .expect(403);
            });

            it('should deny user deletion for all other role types', async () => {
                // Test multiple roles that should not have delete permission
                const tokensToTest = [
                    consultantToken,
                    fieldWorkerToken,
                    contactUserToken,
                    unauthorizedUserToken
                ];

                for (const token of tokensToTest) {
                    await request(app.getHttpServer())
                        .delete(`/users/${testTargetUser._id}`)
                        .set('Authorization', `Bearer ${token}`)
                        .expect(403);
                }
            });
        });
    });
});