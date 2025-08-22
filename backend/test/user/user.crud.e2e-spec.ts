import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../src/users/dto/update-user.dto';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';


describe('Users CRUD - Business Logic & Multi-Tenant Security Testing (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;
    // Models
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let clientModel: Model<ClientDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let orchardModel: Model<any>;
    // Test users representing REAL business stakeholders
    let globalAdminToken: string; // Full user management permissions
    let subsidiaryManagerToken: string; // Can manage users in their subsidiaries
    let clientOwnerToken: string; // Can view/manage users in their client
    let basicUserToken: string; // Limited permissions - can only view self
    let noPermissionUserToken: string; // Has no user permissions
    // Test entities for real agricultural business scenarios
    let testSubsidiary: SubsidiaryDocument;
    let inactiveSubsidiary: SubsidiaryDocument;
    let testClientA: ClientDocument;
    let testClientB: ClientDocument;
    let independentClient: ClientDocument;
    // Test roles for business hierarchy
    let consultantRole: RoleDocument;
    let growerRole: RoleDocument;
    let managerRole: RoleDocument;
    let limitedRole: RoleDocument;
    jest.setTimeout(60000);
    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        orchardModel = app.get<Model<any>>(getModelToken('Orchard'));
        // Create realistic agricultural business hierarchy
        testSubsidiary = await new subsidiaryModel({
            recordId: 'SUB001',
            name: 'Premium Agricultural Solutions',
            isActive: true
        }).save();
        inactiveSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_INACTIVE',
            name: 'Inactive Agricultural Corp',
            isActive: false
        }).save();
        // Create test clients representing different agricultural operations
        testClientA = await new clientModel({
            recordId: 'CLI001',
            name: 'Valley Vista Orchards',
            subsidiaryId: testSubsidiary._id,
            isActive: true
        }).save();
        testClientB = await new clientModel({
            recordId: 'CLI002',
            name: 'Mountain View Fruit Farms',
            subsidiaryId: testSubsidiary._id,
            isActive: true
        }).save();
        independentClient = await new clientModel({
            recordId: 'CLI_INDEPENDENT',
            name: 'Independent Family Farm',
            // No subsidiaryId - independent operation
            isActive: true
        }).save();
        // Create realistic business roles
        const globalAdminRole = await new roleModel({
            recordId: 'GLOBAL_ADMIN_ROLE',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions
            visibilityScope: VisibilityScope.GLOBAL
        }).save();
        const subsidiaryManagerRole = await new roleModel({
            recordId: 'SUBSIDIARY_MANAGER_ROLE',
            name: 'Regional Agricultural Manager',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE,
                PERMISSIONS.USER_EDIT,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: No USER_DELETE - managers can't delete users
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();
        const clientOwnerRole = await new roleModel({
            recordId: 'CLIENT_OWNER_ROLE',
            name: 'Farm Owner',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_EDIT,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: Limited to own client operations
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();
        const basicUserRole = await new roleModel({
            recordId: 'BASIC_USER_ROLE',
            name: 'Agricultural Worker',
            permissions: [
                PERMISSIONS.USER_VIEW, // Can only view, not modify
                PERMISSIONS.ORCHARD_VIEW,
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();
        const noPermissionRole = await new roleModel({
            recordId: 'NO_PERMISSION_ROLE',
            name: 'Restricted Access',
            permissions: [], // No permissions
            visibilityScope: VisibilityScope.CLIENT
        }).save();
        // Create additional business roles for comprehensive testing
        consultantRole = await new roleModel({
            recordId: 'CONSULTANT_ROLE',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();
        growerRole = await new roleModel({
            recordId: 'GROWER_ROLE',
            name: 'Orchard Grower',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();
        managerRole = await new roleModel({
            recordId: 'MANAGER_ROLE',
            name: 'Operations Manager',
            permissions: [
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE,
                PERMISSIONS.USER_EDIT,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();
        limitedRole = await new roleModel({
            recordId: 'LIMITED_ROLE',
            name: 'Limited Access User',
            permissions: [
                PERMISSIONS.USER_VIEW, // View only
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();
        // Create test users for different business stakeholder roles
        const globalAdminUser = await new userModel({
            recordId: 'GLOBAL_ADMIN_USER',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Administrator',
            email: 'admin@rootstock.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            isActive: true
        }).save();
        globalAdminToken = jwtService.sign({ sub: globalAdminUser.recordId });
        const subsidiaryManagerUser = await new userModel({
            recordId: 'SUBSIDIARY_MANAGER_USER',
            name: 'Regional Manager',
            firstName: 'Regional',
            lastName: 'Manager',
            email: 'manager@agrisolutions.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id,
            clientIds: [testClientA._id, testClientB._id], // Manages multiple clients
            isActive: true
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: subsidiaryManagerUser.recordId });
        const clientOwnerUser = await new userModel({
            recordId: 'CLIENT_OWNER_USER',
            name: 'Farm Owner',
            firstName: 'Farm',
            lastName: 'Owner',
            email: 'owner@valleyorchards.com',
            userType: UserType.CONTACT,
            roleId: clientOwnerRole._id,
            clientIds: [testClientA._id], // Only their own farm
            isActive: true
        }).save();
        clientOwnerToken = jwtService.sign({ sub: clientOwnerUser.recordId });
        const basicUser = await new userModel({
            recordId: 'BASIC_USER',
            name: 'Agricultural Worker',
            firstName: 'Agricultural',
            lastName: 'Worker',
            email: 'worker@valleyorchards.com',
            userType: UserType.CONTACT,
            roleId: basicUserRole._id,
            clientIds: [testClientA._id],
            isActive: true
        }).save();
        basicUserToken = jwtService.sign({ sub: basicUser.recordId });
        const noPermissionUser = await new userModel({
            recordId: 'NO_PERMISSION_USER',
            name: 'Restricted User',
            firstName: 'Restricted',
            lastName: 'User',
            email: 'restricted@example.com',
            userType: UserType.CONTACT,
            roleId: noPermissionRole._id,
            clientIds: [testClientA._id],
            isActive: true
        }).save();
        noPermissionUserToken = jwtService.sign({ sub: noPermissionUser.recordId });
    });
    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    beforeEach(async () => {
        // Clean up test-created users, preserve setup users
        await userModel.deleteMany({ 
            recordId: { $nin: [
                'GLOBAL_ADMIN_USER', 
                'SUBSIDIARY_MANAGER_USER',
                'CLIENT_OWNER_USER',
                'BASIC_USER',
                'NO_PERMISSION_USER'
            ] } 
        });
        // Clean up test-created roles, preserve setup roles
        await roleModel.deleteMany({
            recordId: { $nin: [
                'GLOBAL_ADMIN_ROLE',
                'SUBSIDIARY_MANAGER_ROLE', 
                'CLIENT_OWNER_ROLE',
                'BASIC_USER_ROLE',
                'NO_PERMISSION_ROLE',
                'CONSULTANT_ROLE',
                'GROWER_ROLE',
                'MANAGER_ROLE',
                'LIMITED_ROLE'
            ] }
        });
        // Clean up any test-created orchards
        await orchardModel.deleteMany({});
        // Reset setup users to active state
        await userModel.updateMany(
            { recordId: { $in: [
                'GLOBAL_ADMIN_USER', 
                'SUBSIDIARY_MANAGER_USER',
                'CLIENT_OWNER_USER',
                'BASIC_USER',
                'NO_PERMISSION_USER'
            ] } },
            { $set: { isActive: true, isDeleted: false } }
        );
    });
    // REAL BUSINESS MODEL: User Management by Different Stakeholder Types
    describe('Global Administrator User Management (Positive Testing)', () => {
        it('should allow global administrator to create employee users with full access', async () => {
            const newEmployeeData: CreateUserDto = {
                firstName: 'Sarah',
                lastName: 'AgriConsultant',
                email: 'sarah.consultant@agrisolutions.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id.toString(),
                clientIds: [testClientA._id.toString(), testClientB._id.toString()]
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newEmployeeData)
                .expect(201)
                .then(res => {
                    expect(res.body.recordId).toMatch(/^USR\d+$/);
                    expect(res.body.name).toBe('Sarah AgriConsultant');
                    expect(res.body.email).toBe('sarah.consultant@agrisolutions.com');
                    expect(res.body.userType).toBe(UserType.EMPLOYEE);
                    expect(res.body.roleId).toBe(consultantRole._id.toString());
                    expect(res.body.clientIds).toHaveLength(2);
                    expect(res.body.isActive).toBe(true);
                    expect(res.body.isDeleted).toBe(false);
                });
        });
        it('should allow global administrator to create contact users for client relationship', async () => {
            const newContactData: CreateUserDto = {
                firstName: 'John',
                lastName: 'OrchardOwner',
                email: 'john@valleyorchards.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [testClientA._id.toString()]
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newContactData)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toBe('John OrchardOwner');
                    expect(res.body.email).toBe('john@valleyorchards.com');
                    expect(res.body.userType).toBe(UserType.CONTACT);
                    expect(res.body.clientIds).toHaveLength(1);
                    expect(res.body.clientIds[0]).toBe(testClientA._id.toString());
                });
        });
        it('should allow global administrator to create independent consultant with multiple clients', async () => {
            const multiClientConsultant: CreateUserDto = {
                firstName: 'Maria',
                lastName: 'IndependentConsultant',
                email: 'maria.consultant@independent.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id.toString(),
                clientIds: [testClientA._id.toString(), testClientB._id.toString(), independentClient._id.toString()]
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(multiClientConsultant)
                .expect(201)
                .then(res => {
                    expect(res.body.name).toBe('Maria IndependentConsultant');
                    expect(res.body.clientIds).toHaveLength(3);
                    // Verify all client assignments
                    expect(res.body.clientIds).toContain(testClientA._id.toString());
                    expect(res.body.clientIds).toContain(testClientB._id.toString());
                    expect(res.body.clientIds).toContain(independentClient._id.toString());
                });
        });
        it('should allow global administrator to view all users across all clients', async () => {
            return request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(5); // At least our setup users
                    const userRecordIds = res.body.map((user: any) => user.recordId);
                    expect(userRecordIds).toContain('GLOBAL_ADMIN_USER');
                    expect(userRecordIds).toContain('SUBSIDIARY_MANAGER_USER');
                    expect(userRecordIds).toContain('CLIENT_OWNER_USER');
                    expect(userRecordIds).toContain('BASIC_USER');
                    expect(userRecordIds).toContain('NO_PERMISSION_USER');
                });
        });
        it('should allow global administrator to update any user', async () => {
            // Create a test user to update
            const testUser = await new userModel({
                recordId: 'TEST_UPDATE_USER',
                name: 'Test Update',
                firstName: 'Test',
                lastName: 'Update',
                email: 'test.update@e2etest.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id,
                clientIds: [testClientA._id],
                isActive: true
            }).save();
            const updateData: UpdateUserDto = {
                firstName: 'Updated',
                lastName: 'ByAdmin',
                roleId: consultantRole._id.toString()
            };
            return request(app.getHttpServer())
                .patch(`/users/${testUser._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateData)
                .expect(200)
                .then(res => {
                    expect(res.body.name).toBe('Updated ByAdmin');
                    expect(res.body.roleId).toBe(consultantRole._id.toString());
                });
        });
        it('should allow global administrator to delete users', async () => {
            // Create a test user to delete
            const userToDelete = await new userModel({
                recordId: 'USER_FOR_DELETION',
                name: 'User For Deletion',
                firstName: 'User',
                lastName: 'ForDeletion',
                email: 'user.fordeletion@e2etest.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id,
                clientIds: [testClientA._id],
                isActive: true
            }).save();
            // Delete should succeed
            await request(app.getHttpServer())
                .delete(`/users/${userToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isDeleted).toBe(true);
                    expect(res.body.isActive).toBe(false);
                });
            // User should no longer be accessible via normal GET
            await request(app.getHttpServer())
                .get(`/users/${userToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
        it('should prevent duplicate users when creating users concurrently', async () => {
            const userData: CreateUserDto = {
                firstName: 'Concurrent',
                lastName: 'TestUser',
                email: 'concurrent.testuser@e2etest.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id.toString(),
                clientIds: [testClientA._id.toString()]
            };
            // Create multiple concurrent requests
            const createPromises = Array.from({ length: 3 }, () =>
                request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(userData)
            );
            const results = await Promise.allSettled(createPromises);
            // At least one should succeed, others might fail due to unique constraints
            const successfulResults = results.filter(r => 
                r.status === 'fulfilled' && (r as any).value.status === 201
            );
            expect(successfulResults.length).toBeGreaterThanOrEqual(1);
            // Verify unique recordIds were generated
            const recordIds = successfulResults.map(r => 
                (r as any).value.body.recordId
            );
            recordIds.forEach(recordId => {
                expect(recordId).toMatch(/^USR\d+$/);
            });
            const uniqueIds = new Set(recordIds);
            expect(uniqueIds.size).toBe(successfulResults.length); // All should be unique
        });
    });
    describe('Security Enforcement: Multi-Tenant Permission-Based Access Control (Negative Testing)', () => {
        describe('Subsidiary Manager - Limited User Management Access', () => {
            it('should allow subsidiary manager to view users within their scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .expect(200)
                    .then(res => {
                        // Should see users in their subsidiary clients
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        // All returned users should be within manager's client scope
                        res.body.forEach((user: any) => {
                            const userClientIds = user.clientIds || [];
                            const hasOverlap = userClientIds.some((clientId: string) =>
                                [testClientA._id.toString(), testClientB._id.toString()].includes(clientId)
                            );
                            // Either has overlapping clients or is a global/subsidiary-scoped user
                            expect(hasOverlap || !user.clientIds || user.clientIds.length === 0).toBe(true);
                        });
                    });
            });
            it('should allow subsidiary manager to create users for their clients', async () => {
                const newUserData: CreateUserDto = {
                    firstName: 'New',
                    lastName: 'TeamMember',
                    email: 'new.teammember@subsidiary.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()]
                };
                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(newUserData)
                    .expect(201)
                    .then(res => {
                        expect(res.body.name).toBe('New TeamMember');
                        expect(res.body.clientIds).toContain(testClientA._id.toString());
                    });
            });
            it('should prevent subsidiary manager from creating users for clients outside their scope', async () => {
                const unauthorizedUserData: CreateUserDto = {
                    firstName: 'Unauthorized',
                    lastName: 'User',
                    email: 'unauthorized.user@outside.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [independentClient._id.toString()] // Outside manager's scope
                };
                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(unauthorizedUserData)
                    .expect(403); // Should be forbidden
            });
            it('should prevent subsidiary manager from deleting users (lacks permission)', async () => {
                // Create a test user in manager's scope
                const testUser = await new userModel({
                    recordId: 'TEST_DELETE_USER',
                    name: 'Test Delete',
                    firstName: 'Test',
                    lastName: 'Delete',
                    email: 'test.delete@subsidiary.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();
                // Manager lacks USER_DELETE permission
                return request(app.getHttpServer())
                    .delete(`/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .expect(403);
            });
        });
        describe('Client Owner - Client-Scoped User Access', () => {
            it('should allow client owner to view users in their client only', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .expect(200)
                    .then(res => {
                        // Should only see users from their client
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        res.body.forEach((user: any) => {
                            // Either assigned to their client or no client restrictions
                            const userClientIds = user.clientIds || [];
                            if (userClientIds.length > 0) {
                                expect(userClientIds).toContain(testClientA._id.toString());
                            }
                        });
                    });
            });
            it('should prevent client owner from accessing users outside their client', async () => {
                // Create a user for a different client
                const outsideUser = await new userModel({
                    recordId: 'OUTSIDE_CLIENT_USER',
                    name: 'Outside Client User',
                    firstName: 'Outside',
                    lastName: 'User',
                    email: 'outside.user@different.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientB._id], // Different client
                    isActive: true
                }).save();
                // Client owner should not see this user
                return request(app.getHttpServer())
                    .get(`/users/${outsideUser._id}`)
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .expect(404); // Filtered out by visibility scope
            });
            it('should prevent client owner from creating users (lacks permission)', async () => {
                const newUserData: CreateUserDto = {
                    firstName: 'Unauthorized',
                    lastName: 'Creation',
                    email: 'unauthorized.creation@clientowner.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()]
                };
                // Client owner lacks USER_CREATE permission
                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .send(newUserData)
                    .expect(403);
            });
            it('should allow client owner to update their own information (CONTACT user self-update)', async () => {
                // Client owner is a CONTACT user, so they can only update themselves
                const clientOwnerUser = await userModel.findOne({ recordId: 'CLIENT_OWNER_USER' }).populate('roleId').exec();
                expect(clientOwnerUser).not.toBeNull();
                
                const updateData = {
                    firstName: 'Updated Farm',
                    lastName: 'Updated Owner',
                    email: 'updated.owner@valleyorchards.com'
                };
                
                return request(app.getHttpServer())
                    .patch(`/users/${clientOwnerUser!._id}`)
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Updated Farm Updated Owner');
                        expect(res.body.email).toBe('updated.owner@valleyorchards.com');
                    });
            });

            it('should prevent client owner (CONTACT user) from updating other users', async () => {
                // Create a different user in same client
                const otherUser = await new userModel({
                    recordId: 'OTHER_CLIENT_USER',
                    name: 'Other Client User',
                    firstName: 'Other',
                    lastName: 'User',
                    email: 'other.user@sameclient.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                const updateData: UpdateUserDto = {
                    firstName: 'Updated',
                    lastName: 'ByOwner'
                };
                
                // CONTACT users can only update themselves
                return request(app.getHttpServer())
                    .patch(`/users/${otherUser._id}`)
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('Contact users can only update their basic account information.');
                    });
            });
        });
        describe('Basic User - Read-Only Access', () => {
            it('should allow basic user to view users in their scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${basicUserToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        // Should see users in their client
                        const userRecordIds = res.body.map((user: any) => user.recordId);
                        expect(userRecordIds).toContain('BASIC_USER'); // Can see themselves
                        expect(userRecordIds).toContain('CLIENT_OWNER_USER'); // Same client
                    });
            });
            it('should prevent basic user from creating users (lacks permission)', async () => {
                const newUserData: CreateUserDto = {
                    firstName: 'Unauthorized',
                    lastName: 'Creation',
                    email: 'unauthorized.creation@basicuser.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()]
                };
                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${basicUserToken}`)
                    .send(newUserData)
                    .expect(403);
            });
            it('should prevent basic user from updating users (lacks permission)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Unauthorized',
                    lastName: 'Update'
                };
                return request(app.getHttpServer())
                    .patch(`/users/${testClientA._id}`) // Try to update any user
                    .set('Authorization', `Bearer ${basicUserToken}`)
                    .send(updateData)
                    .expect(403);
            });
            it('should prevent basic user from deleting users (lacks permission)', async () => {
                // Create a test user
                const testUser = await new userModel({
                    recordId: 'TEST_DELETE_BASIC',
                    name: 'Test Delete Basic',
                    firstName: 'Test',
                    lastName: 'Delete',
                    email: 'test.delete.basic@basicuser.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();
                return request(app.getHttpServer())
                    .delete(`/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${basicUserToken}`)
                    .expect(403);
            });
        });
        describe('No Permission User - Restricted Access', () => {
            it('should prevent no-permission user from accessing user endpoints', async () => {
                // Should not be able to view users
                await request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .expect(403);
                // Should not be able to create users
                const userData: CreateUserDto = {
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test.user@nopermission.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()]
                };
                await request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${noPermissionUserToken}`)
                    .send(userData)
                    .expect(403);
            });
        });
    });

    describe('Advanced Visibility Scope Security Testing (Multi-Tenant Business Logic)', () => {
        describe('Global Visibility Scope - Unrestricted Access', () => {
            it('should allow Global users to create users with any client assignments', async () => {
                const globalUserData: CreateUserDto = {
                    firstName: 'Global',
                    lastName: 'CreatedUser',
                    email: 'global.created@anywhere.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id.toString(),
                    clientIds: [testClientA._id.toString(), testClientB._id.toString(), independentClient._id.toString()]
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(globalUserData)
                    .expect(201)
                    .then(res => {
                        expect(res.body.clientIds).toHaveLength(3);
                        expect(res.body.clientIds).toContain(testClientA._id.toString());
                        expect(res.body.clientIds).toContain(testClientB._id.toString());
                        expect(res.body.clientIds).toContain(independentClient._id.toString());
                    });
            });

            it('should allow Global users to create unassigned users', async () => {
                const unassignedUserData: CreateUserDto = {
                    firstName: 'Unassigned',
                    lastName: 'GlobalUser',
                    email: 'unassigned.global@platform.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id.toString()
                    // No clientIds - only Global users can create unassigned users
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(unassignedUserData)
                    .expect(201)
                    .then(res => {
                        expect(res.body.clientIds).toEqual([]);
                        expect(res.body.userType).toBe(UserType.EMPLOYEE);
                    });
            });

            it('should allow Global users to update user client assignments to any clients', async () => {
                // Create a user with limited client assignment
                const limitedUser = await new userModel({
                    recordId: 'LIMITED_USER',
                    name: 'Limited User',
                    firstName: 'Limited',
                    lastName: 'User',
                    email: 'limited.user@expand.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                const expansionUpdate: UpdateUserDto = {
                    clientIds: [testClientA._id.toString(), testClientB._id.toString(), independentClient._id.toString()]
                };

                return request(app.getHttpServer())
                    .patch(`/users/${limitedUser._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(expansionUpdate)
                    .expect(200)
                    .then(res => {
                        expect(res.body.clientIds).toHaveLength(3);
                        expect(res.body.clientIds).toContain(testClientA._id.toString());
                        expect(res.body.clientIds).toContain(testClientB._id.toString());
                        expect(res.body.clientIds).toContain(independentClient._id.toString());
                    });
            });

            it('should allow Global users to delete any user regardless of client assignments', async () => {
                // Create users with different client scopes
                const multiClientUser = await new userModel({
                    recordId: 'MULTI_CLIENT_DELETE',
                    name: 'Multi Client User',
                    firstName: 'Multi',
                    lastName: 'Client',
                    email: 'multi.client@delete.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id,
                    clientIds: [testClientA._id, testClientB._id, independentClient._id],
                    isActive: true
                }).save();

                return request(app.getHttpServer())
                    .delete(`/users/${multiClientUser._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.isDeleted).toBe(true);
                        expect(res.body.isActive).toBe(false);
                    });
            });
        });

        describe('Subsidiary Visibility Scope - Multi-Client Management', () => {
            it('should allow Subsidiary users to create users for clients in their subsidiary', async () => {
                const subsidiaryUserData: CreateUserDto = {
                    firstName: 'Subsidiary',
                    lastName: 'Managed',
                    email: 'subsidiary.managed@subsidiary.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()] // Within subsidiary scope
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(subsidiaryUserData)
                    .expect(201)
                    .then(res => {
                        expect(res.body.clientIds).toContain(testClientA._id.toString());
                        expect(res.body.userType).toBe(UserType.CONTACT);
                    });
            });

            it('should prevent Subsidiary users from creating users for clients outside their subsidiary', async () => {
                const outsideSubsidiaryData: CreateUserDto = {
                    firstName: 'Outside',
                    lastName: 'Subsidiary',
                    email: 'outside.subsidiary@independent.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [independentClient._id.toString()] // Outside subsidiary scope
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(outsideSubsidiaryData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('permission to assign or use clients');
                    });
            });

            it('should allow Subsidiary users to update users within their subsidiary clients', async () => {
                // Create user within subsidiary scope
                const subsidiaryUser = await new userModel({
                    recordId: 'SUBSIDIARY_SCOPED_USER',
                    name: 'Subsidiary Scoped User',
                    firstName: 'Subsidiary',
                    lastName: 'Scoped',
                    email: 'subsidiary.scoped@inscope.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                const updateData: UpdateUserDto = {
                    firstName: 'Updated Subsidiary',
                    clientIds: [testClientA._id.toString(), testClientB._id.toString()] // Both in same subsidiary
                };

                return request(app.getHttpServer())
                    .patch(`/users/${subsidiaryUser._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.firstName).toBe('Updated Subsidiary');
                        expect(res.body.clientIds).toHaveLength(2);
                    });
            });

            it('should prevent Subsidiary users from updating users with clients outside their scope', async () => {
                // Create user with mixed client scope (some in, some out)
                const mixedScopeUser = await new userModel({
                    recordId: 'MIXED_SCOPE_USER',
                    name: 'Mixed Scope User',
                    firstName: 'Mixed',
                    lastName: 'Scope',
                    email: 'mixed.scope@test.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id,
                    clientIds: [testClientA._id], // Currently in scope
                    isActive: true
                }).save();

                const unauthorizedUpdate: UpdateUserDto = {
                    clientIds: [testClientA._id.toString(), independentClient._id.toString()] // Adding outside scope
                };

                return request(app.getHttpServer())
                    .patch(`/users/${mixedScopeUser._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(unauthorizedUpdate)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('permission to assign or use clients');
                    });
            });
        });

        describe('Client Visibility Scope - Single Client Operations', () => {
            let clientScopedManagerToken: string;

            beforeEach(async () => {
                // Create a client-scoped manager (EMPLOYEE with client scope)
                const clientManagerRole = await new roleModel({
                    recordId: 'CLIENT_MANAGER_ROLE',
                    name: 'Client Manager',
                    permissions: [
                        PERMISSIONS.USER_VIEW,
                        PERMISSIONS.USER_CREATE,
                        PERMISSIONS.USER_EDIT,
                        PERMISSIONS.CLIENT_VIEW
                    ],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                const clientManager = await new userModel({
                    recordId: 'CLIENT_MANAGER_USER',
                    name: 'Client Manager',
                    firstName: 'Client',
                    lastName: 'Manager',
                    email: 'client.manager@clienta.com',
                    userType: UserType.EMPLOYEE,
                    roleId: clientManagerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                clientScopedManagerToken = jwtService.sign({ sub: clientManager.recordId });
            });

            it('should allow Client-scoped users to create users for their own client only', async () => {
                const clientUserData: CreateUserDto = {
                    firstName: 'Client',
                    lastName: 'Specific',
                    email: 'client.specific@clienta.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()] // Their own client
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${clientScopedManagerToken}`)
                    .send(clientUserData)
                    .expect(201)
                    .then(res => {
                        expect(res.body.clientIds).toEqual([testClientA._id.toString()]);
                    });
            });

            it('should prevent Client-scoped users from creating users for other clients', async () => {
                const otherClientUserData: CreateUserDto = {
                    firstName: 'Other',
                    lastName: 'Client',
                    email: 'other.client@clientb.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientB._id.toString()] // Different client
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${clientScopedManagerToken}`)
                    .send(otherClientUserData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('permission to assign or use clients');
                    });
            });

            it('should prevent Client-scoped users from creating multi-client users', async () => {
                const multiClientUserData: CreateUserDto = {
                    firstName: 'Multi',
                    lastName: 'Client',
                    email: 'multi.client@attempt.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id.toString(),
                    clientIds: [testClientA._id.toString(), testClientB._id.toString()] // Multiple clients
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${clientScopedManagerToken}`)
                    .send(multiClientUserData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('permission to assign or use clients');
                    });
            });

            it('should allow Client-scoped users to update users in their client', async () => {
                const clientUser = await new userModel({
                    recordId: 'CLIENT_USER_UPDATE',
                    name: 'Client User Update',
                    firstName: 'Client',
                    lastName: 'User',
                    email: 'client.user@clienta.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                const updateData: UpdateUserDto = {
                    firstName: 'Updated Client',
                    lastName: 'Updated User'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${clientUser._id}`)
                    .set('Authorization', `Bearer ${clientScopedManagerToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Updated Client Updated User');
                    });
            });

            it('should prevent Client-scoped users from accessing users outside their client', async () => {
                const outsideClientUser = await new userModel({
                    recordId: 'OUTSIDE_CLIENT_USER_UPDATE',
                    name: 'Outside Client User',
                    firstName: 'Outside',
                    lastName: 'User',
                    email: 'outside.user@clientb.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientB._id], // Different client
                    isActive: true
                }).save();

                const updateData: UpdateUserDto = {
                    firstName: 'Attempted Update'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${outsideClientUser._id}`)
                    .set('Authorization', `Bearer ${clientScopedManagerToken}`)
                    .send(updateData)
                    .expect(404); // Filtered out by visibility scope
            });
        });

        describe('Visibility Scope Enforcement in User Queries', () => {
            it('should filter user queries based on Global visibility scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        // Global users see all users
                        expect(res.body.length).toBeGreaterThanOrEqual(5);
                        const recordIds = res.body.map((user: any) => user.recordId);
                        expect(recordIds).toContain('GLOBAL_ADMIN_USER');
                        expect(recordIds).toContain('SUBSIDIARY_MANAGER_USER');
                        expect(recordIds).toContain('CLIENT_OWNER_USER');
                    });
            });

            it('should filter user queries based on Subsidiary visibility scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .expect(200)
                    .then(res => {
                        // Should see users in their subsidiary's clients
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        res.body.forEach((user: any) => {
                            const userClientIds = user.clientIds || [];
                            if (userClientIds.length > 0) {
                                // User must have at least one client in the subsidiary's scope
                                const hasValidClient = userClientIds.some((clientId: string) =>
                                    [testClientA._id.toString(), testClientB._id.toString()].includes(clientId)
                                );
                                expect(hasValidClient).toBe(true);
                            }
                        });
                    });
            });

            it('should filter user queries based on Client visibility scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${clientOwnerToken}`)
                    .expect(200)
                    .then(res => {
                        // Should only see users in their specific client
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        res.body.forEach((user: any) => {
                            const userClientIds = user.clientIds || [];
                            if (userClientIds.length > 0) {
                                expect(userClientIds).toContain(testClientA._id.toString());
                            }
                        });
                    });
            });
        });
    });

    describe('CONTACT User Business Rule Enforcement (Real-World Security)', () => {
        let contactUserToken: string;
        let contactUserId: string;
        let otherContactUserId: string;
        let employeeUserId: string;
        let contactUserWithEditPermissionToken: string;
        let contactUserWithEditPermissionId: string;

        beforeEach(async () => {
            // Create a role for CONTACT users with edit permission (for testing self-updates)
            const contactEditRole = await new roleModel({
                recordId: 'CONTACT_EDIT_ROLE',
                name: 'Contact with Edit Permission',
                permissions: [
                    PERMISSIONS.USER_VIEW,
                    PERMISSIONS.USER_EDIT, // Required for any user updates
                    PERMISSIONS.ORCHARD_VIEW,
                ],
                visibilityScope: VisibilityScope.CLIENT
            }).save();

            // Create a CONTACT user WITH edit permission for testing successful self-updates
            const contactUserWithEditPermission = await new userModel({
                recordId: 'TEST_CONTACT_USER_WITH_EDIT',
                name: 'Test Contact User With Edit',
                firstName: 'Test',
                lastName: 'ContactEdit',
                email: 'test.contactedit@e2econtact.com',
                userType: UserType.CONTACT,
                roleId: contactEditRole._id,
                clientIds: [testClientA._id],
                isActive: true
            }).save();
            contactUserWithEditPermissionId = contactUserWithEditPermission._id.toString();
            contactUserWithEditPermissionToken = jwtService.sign({ sub: contactUserWithEditPermission.recordId });

            // Create a CONTACT user WITHOUT edit permission (using growerRole)
            const contactUser = await new userModel({
                recordId: 'TEST_CONTACT_USER',
                name: 'Test Contact User',
                firstName: 'Test',
                lastName: 'Contact',
                email: 'test.contact@e2econtact.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id, // growerRole does NOT have USER_EDIT permission
                clientIds: [testClientA._id],
                isActive: true
            }).save();
            contactUserId = contactUser._id.toString();
            contactUserToken = jwtService.sign({ sub: contactUser.recordId });

            // Create another CONTACT user for cross-user testing
            const otherContactUser = await new userModel({
                recordId: 'OTHER_CONTACT_USER',
                name: 'Other Contact User',
                firstName: 'Other',
                lastName: 'Contact',
                email: 'other.contact@e2econtact.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id,
                clientIds: [testClientA._id], // Same client, but different user
                isActive: true
            }).save();
            otherContactUserId = otherContactUser._id.toString();

            // Create an EMPLOYEE user for cross-user testing
            const employeeUser = await new userModel({
                recordId: 'TEST_EMPLOYEE_USER',
                name: 'Test Employee User',
                firstName: 'Test',
                lastName: 'Employee',
                email: 'test.employee@e2eemployee.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id,
                clientIds: [testClientA._id],
                isActive: true
            }).save();
            employeeUserId = employeeUser._id.toString();
        });

        describe('CONTACT User Self-Update Permissions', () => {
            it('should allow CONTACT user to update their own basic personal information (when they have USER_EDIT permission)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Updated Contact',
                    lastName: 'Updated Name',
                    email: 'updated.contact@e2econtact.com'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserWithEditPermissionId}`)
                    .set('Authorization', `Bearer ${contactUserWithEditPermissionToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Updated Contact Updated Name');
                        expect(res.body.email).toBe('updated.contact@e2econtact.com');
                        expect(res.body.firstName).toBe('Updated Contact');
                        expect(res.body.lastName).toBe('Updated Name');
                    });
            });

            it('should prevent CONTACT user from updating their own information (when they lack USER_EDIT permission)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Updated Contact',
                    lastName: 'Updated Name',
                    email: 'updated.contact@e2econtact.com'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions');
                    });
            });

            it('should allow CONTACT user to update only firstName field (when they have USER_EDIT permission)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'OnlyFirstName'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserWithEditPermissionId}`)
                    .set('Authorization', `Bearer ${contactUserWithEditPermissionToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.firstName).toBe('OnlyFirstName');
                        expect(res.body.name).toBe('OnlyFirstName ContactEdit'); // Name should be computed correctly
                    });
            });

            it('should allow CONTACT user to update only email field (when they have USER_EDIT permission)', async () => {
                const updateData: UpdateUserDto = {
                    email: 'only.email@update.com'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserWithEditPermissionId}`)
                    .set('Authorization', `Bearer ${contactUserWithEditPermissionToken}`)
                    .send(updateData)
                    .expect(200)
                    .then(res => {
                        expect(res.body.email).toBe('only.email@update.com');
                        expect(res.body.firstName).toBe('Test'); // Other fields unchanged
                        expect(res.body.lastName).toBe('ContactEdit');
                    });
            });
        });

        describe('CONTACT User Restricted Field Enforcement', () => {
            it('should prevent CONTACT user from updating roleId field', async () => {
                const updateData: UpdateUserDto = {
                    roleId: consultantRole._id.toString() // UNAUTHORIZED field
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from updating clientIds field', async () => {
                const updateData: UpdateUserDto = {
                    clientIds: [testClientB._id.toString()] // UNAUTHORIZED field
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from updating userType field', async () => {
                const updateData: UpdateUserDto = {
                    userType: UserType.EMPLOYEE // UNAUTHORIZED field
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from updating isActive field', async () => {
                const updateData: UpdateUserDto = {
                    isActive: false // UNAUTHORIZED field
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from updating multiple unauthorized fields simultaneously', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Allowed Update', // This field is allowed
                    roleId: consultantRole._id.toString(), // UNAUTHORIZED
                    clientIds: [testClientB._id.toString()], // UNAUTHORIZED
                    isActive: false, // UNAUTHORIZED
                    userType: UserType.EMPLOYEE // UNAUTHORIZED
                };

                return request(app.getHttpServer())
                    .patch(`/users/${contactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });
        });

        describe('CONTACT User Cross-User Restrictions', () => {
            it('should prevent CONTACT user from updating other CONTACT users (same client)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Attempted Update', // Even allowed fields should fail
                    email: 'attempted@update.com'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${otherContactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from updating EMPLOYEE users (same client)', async () => {
                const updateData: UpdateUserDto = {
                    firstName: 'Attempted Update', // Even allowed fields should fail
                    email: 'attempted@update.com'
                };

                return request(app.getHttpServer())
                    .patch(`/users/${employeeUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toContain('You do not have the required permissions to perform this action');
                    });
            });

            it('should prevent CONTACT user from accessing users outside their visibility scope', async () => {
                // Create a user in a different client outside CONTACT user's scope
                const outsideUser = await new userModel({
                    recordId: 'OUTSIDE_SCOPE_USER',
                    name: 'Outside Scope User',
                    firstName: 'Outside',
                    lastName: 'User',
                    email: 'outside@differentclient.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientB._id], // Different client
                    isActive: true
                }).save();

                const updateData: UpdateUserDto = {
                    firstName: 'Attempted Update'
                };

                // Should get 403 because user lacks USER_EDIT permission (permission check happens first)
                return request(app.getHttpServer())
                    .patch(`/users/${outsideUser._id}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(updateData)
                    .expect(403);
            });
        });

        describe('CONTACT User Business Rule Integration with Other Operations', () => {
            it('should prevent CONTACT users from creating other users', async () => {
                const newUserData: CreateUserDto = {
                    firstName: 'Unauthorized',
                    lastName: 'Creation',
                    email: 'unauthorized.creation@contact.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id.toString(),
                    clientIds: [testClientA._id.toString()]
                };

                return request(app.getHttpServer())
                    .post('/users')
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .send(newUserData)
                    .expect(403); // Should fail due to lack of USER_CREATE permission
            });

            it('should prevent CONTACT users from deleting users', async () => {
                return request(app.getHttpServer())
                    .delete(`/users/${otherContactUserId}`)
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .expect(403); // Should fail due to lack of USER_DELETE permission
            });

            it('should allow CONTACT users to view users in their scope', async () => {
                return request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${contactUserToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.length).toBeGreaterThanOrEqual(1);
                        // Should see themselves and others in same client
                        const recordIds = res.body.map((user: any) => user.recordId);
                        expect(recordIds).toContain('TEST_CONTACT_USER'); // Can see themselves
                    });
            });
        });
    });

    describe('Business Validation Rules', () => {
        it('should enforce business rule: CONTACT users must have exactly one client', async () => {
            const invalidContactData: CreateUserDto = {
                firstName: 'Invalid',
                lastName: 'Contact',
                email: 'invalid.contact@businessrule.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [] // CONTACT users need at least one client
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidContactData)
                .expect(400);
        });
        it('should enforce business rule: Users cannot be assigned to inactive clients', async () => {
            // Create an inactive client
            const inactiveClient = await new clientModel({
                recordId: 'INACTIVE_CLIENT',
                name: 'Inactive Client',
                subsidiaryId: testSubsidiary._id,
                isActive: false
            }).save();
            const invalidUserData: CreateUserDto = {
                firstName: 'Invalid',
                lastName: 'Assignment',
                email: 'invalid.assignment@inactive.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [inactiveClient._id.toString()] // Inactive client
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidUserData)
                .expect(400);
        });
        it('should enforce business rule: Users cannot be assigned non-existent roles', async () => {
            const invalidRoleData: CreateUserDto = {
                firstName: 'Invalid',
                lastName: 'Role',
                email: 'invalid.role@nonexistent.com',
                userType: UserType.EMPLOYEE,
                roleId: new Types.ObjectId().toHexString(), // Non-existent role
                clientIds: [testClientA._id.toString()]
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidRoleData)
                .expect(400);
        });
        it('should enforce business rule: Users cannot be assigned non-existent clients', async () => {
            const invalidClientData: CreateUserDto = {
                firstName: 'Invalid',
                lastName: 'Client',
                email: 'invalid.client@nonexistent.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [new Types.ObjectId().toHexString()] // Non-existent client
            };
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidClientData)
                .expect(400);
        });
    });
    describe('Complex Business Scenarios', () => {
        it('should handle user role transition from CONTACT to EMPLOYEE', async () => {
            // Create a CONTACT user
            const contactData: CreateUserDto = {
                firstName: 'Promoting',
                lastName: 'User',
                email: 'promoting.user@transition.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [testClientA._id.toString()]
            };
            const createResponse = await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(contactData)
                .expect(201);
            const createdUserId = createResponse.body._id;
            // Update to EMPLOYEE with expanded role and clients
            const updateData: UpdateUserDto = {
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id.toString(),
                clientIds: [testClientA._id.toString(), testClientB._id.toString()]
            };
            return request(app.getHttpServer())
                .patch(`/users/${createdUserId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateData)
                .expect(200)
                .then(res => {
                    expect(res.body.userType).toBe(UserType.EMPLOYEE);
                    expect(res.body.roleId).toBe(consultantRole._id.toString());
                    expect(res.body.clientIds).toHaveLength(2);
                });
        });
        it('should handle multi-client consultant assignment changes', async () => {
            // Create consultant with multiple clients
            const consultantData: CreateUserDto = {
                firstName: 'Multi',
                lastName: 'ClientConsultant',
                email: 'multi.clientconsultant@multiclient.com',
                userType: UserType.EMPLOYEE,
                roleId: consultantRole._id.toString(),
                clientIds: [testClientA._id.toString(), testClientB._id.toString()]
            };
            const createResponse = await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(consultantData)
                .expect(201);
            const consultantUserId = createResponse.body._id;
            // Update to remove one client and add independent client
            const updateData: UpdateUserDto = {
                clientIds: [testClientB._id.toString(), independentClient._id.toString()]
            };
            return request(app.getHttpServer())
                .patch(`/users/${consultantUserId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateData)
                .expect(200)
                .then(res => {
                    expect(res.body.clientIds).toHaveLength(2);
                    expect(res.body.clientIds).toContain(testClientB._id.toString());
                    expect(res.body.clientIds).toContain(independentClient._id.toString());
                    expect(res.body.clientIds).not.toContain(testClientA._id.toString());
                });
        });
        it('should handle user deactivation and reactivation workflow', async () => {
            // Create user
            const userData: CreateUserDto = {
                firstName: 'Deactivation',
                lastName: 'Test',
                email: 'deactivation.test@workflow.com',
                userType: UserType.CONTACT,
                roleId: growerRole._id.toString(),
                clientIds: [testClientA._id.toString()]
            };
            const createResponse = await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(userData)
                .expect(201);
            const userId = createResponse.body._id;
            // Deactivate user
            await request(app.getHttpServer())
                .patch(`/users/${userId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send({ isActive: false })
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(false);
                });
            
            // For reactivation, we need to use direct database access since inactive users are filtered out
            // This simulates an admin accessing the user through a different interface
            const userToReactivate = await userModel.findById(userId).exec();
            expect(userToReactivate).not.toBeNull();
            expect(userToReactivate!.isActive).toBe(false);
            
            // Reactivate via direct database update (simulating admin tool)
            await userModel.findByIdAndUpdate(userId, { isActive: true }).exec();
            
            // Verify reactivation worked
            const reactivatedUser = await userModel.findById(userId).exec();
            expect(reactivatedUser).not.toBeNull();
            expect(reactivatedUser!.isActive).toBe(true);
            
            // Now the user should be queryable again
            return request(app.getHttpServer())
                .get(`/users/${userId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(true);
                    expect(res.body.name).toBe('Deactivation Test');
                });
        });
    });

    describe('Advanced Query Operations & Filtering', () => {
        describe('Scope-Based Query Filtering', () => {
            it('should return users filtered by visibility scope and permissions', async () => {
                // Arrange: Create users across different scopes for filtering test
                const limitedViewRole = await new roleModel({
                    recordId: 'LIMITED_VIEW_ROLE_CRUD',
                    name: 'Limited View Agricultural Worker',
                    permissions: [
                        PERMISSIONS.USER_VIEW,
                        PERMISSIONS.CLIENT_VIEW
                    ],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                const limitedViewUser = await new userModel({
                    recordId: 'LIMITED_VIEW_USER_CRUD',
                    name: 'Limited View Agricultural Worker',
                    firstName: 'Limited',
                    lastName: 'Worker',
                    email: 'limited@agri-work.com',
                    userType: UserType.EMPLOYEE,
                    roleId: limitedViewRole._id,
                    clientIds: [testClientA._id], // Only testClientA access
                    isActive: true
                }).save();

                // Create test users for different scopes
                const scopeTestUsers = await Promise.all([
                    // Same client - should be visible
                    new userModel({
                        recordId: 'SAME_CLIENT_USER_CRUD',
                        name: 'Same Client User',
                        firstName: 'Same',
                        lastName: 'Client',
                        email: 'same@valleyorchards.com',
                        userType: UserType.CONTACT,
                        roleId: limitedViewRole._id,
                        clientIds: [testClientA._id],
                        isActive: true
                    }).save(),
                    
                    // Different client - should be hidden
                    new userModel({
                        recordId: 'DIFFERENT_CLIENT_USER_CRUD',
                        name: 'Different Client User',
                        firstName: 'Different',
                        lastName: 'Client',
                        email: 'different@mountainfarms.com',
                        userType: UserType.CONTACT,
                        roleId: limitedViewRole._id,
                        clientIds: [testClientB._id],
                        isActive: true
                    }).save()
                ]);

                // Act: Query users with limited scope user
                const limitedScopeToken = jwtService.sign({ sub: limitedViewUser.recordId });
                const queryResponse = await request(app.getHttpServer())
                    .get('/users?userType=contact')
                    .set('Authorization', `Bearer ${limitedScopeToken}`)
                    .expect(200);

                // Assert: Verify scope-based filtering
                const returnedUsers = queryResponse.body;
                const visibleRecordIds = returnedUsers.map((user: any) => user.recordId);

                // Should see same-client user
                expect(visibleRecordIds).toContain('SAME_CLIENT_USER_CRUD');
                
                // Should NOT see different-client user
                expect(visibleRecordIds).not.toContain('DIFFERENT_CLIENT_USER_CRUD');

                // Verify global scope user can see all
                const globalQueryResponse = await request(app.getHttpServer())
                    .get('/users?userType=contact')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);

                const globalVisibleIds = globalQueryResponse.body.map((user: any) => user.recordId);
                expect(globalVisibleIds).toContain('SAME_CLIENT_USER_CRUD');
                expect(globalVisibleIds).toContain('DIFFERENT_CLIENT_USER_CRUD');
            });
        });

        describe('Permission-Aware Result Filtering', () => {
            it('should filter query results based on user permissions and business rules', async () => {
                // Arrange: Setup permission-aware filtering scenario
                const auditingRole = await new roleModel({
                    recordId: 'AUDITING_ROLE_CRUD',
                    name: 'Agricultural Operations Auditor',
                    permissions: [
                        PERMISSIONS.USER_VIEW,
                        PERMISSIONS.CLIENT_VIEW,
                        PERMISSIONS.SUBSIDIARY_VIEW
                    ],
                    visibilityScope: VisibilityScope.GLOBAL
                }).save();

                const auditor = await new userModel({
                    recordId: 'AUDITOR_USER_CRUD',
                    name: 'Agricultural Operations Auditor',
                    firstName: 'Operations',
                    lastName: 'Auditor',
                    email: 'auditor@agri-compliance.com',
                    userType: UserType.EMPLOYEE,
                    roleId: auditingRole._id,
                    isActive: true
                }).save();

                // Create users with different activation states
                const auditTestUsers = await Promise.all([
                    new userModel({
                        recordId: 'ACTIVE_AUDIT_USER_CRUD',
                        name: 'Active User for Audit',
                        firstName: 'Active',
                        lastName: 'Audit',
                        email: 'active@audit-test.com',
                        userType: UserType.CONTACT,
                        roleId: auditingRole._id,
                        clientIds: [testClientA._id],
                        isActive: true
                    }).save(),
                    
                    new userModel({
                        recordId: 'INACTIVE_AUDIT_USER_CRUD',
                        name: 'Inactive User for Audit',
                        firstName: 'Inactive',
                        lastName: 'Audit',
                        email: 'inactive@audit-test.com',
                        userType: UserType.CONTACT,
                        roleId: auditingRole._id,
                        clientIds: [testClientA._id],
                        isActive: false
                    }).save(),
                    
                    new userModel({
                        recordId: 'DELETED_AUDIT_USER_CRUD',
                        name: 'Deleted User for Audit',
                        firstName: 'Deleted',
                        lastName: 'Audit',
                        email: 'deleted@audit-test.com',
                        userType: UserType.CONTACT,
                        roleId: auditingRole._id,
                        clientIds: [testClientA._id],
                        isActive: false,
                        isDeleted: true
                    }).save()
                ]);

                // Act: Query with different filters
                const auditorToken = jwtService.sign({ sub: auditor.recordId });

                // Standard query - should return active users
                const activeResponse = await request(app.getHttpServer())
                    .get('/users')
                    .set('Authorization', `Bearer ${auditorToken}`)
                    .expect(200);

                // Query for specific user type
                const contactResponse = await request(app.getHttpServer())
                    .get('/users?userType=contact')
                    .set('Authorization', `Bearer ${auditorToken}`)
                    .expect(200);

                // Assert: Verify permission-based filtering
                const activeIds = activeResponse.body.map((user: any) => user.recordId);
                const contactIds = contactResponse.body.map((user: any) => user.recordId);

                // Standard query should show users visible to auditor
                expect(activeIds).toContain('ACTIVE_AUDIT_USER_CRUD');

                // Contact query should only show CONTACT type users
                const contactTypes = contactResponse.body.map((user: any) => user.userType);
                contactTypes.forEach((type: string) => {
                    expect(type).toBe('contact');
                });
            });
        });

        describe('Query Parameter Validation', () => {
            it('should handle userType query parameter correctly', async () => {
                // Arrange: Create users of different types
                const employeeUser = await new userModel({
                    recordId: 'QUERY_EMPLOYEE_CRUD',
                    name: 'Query Employee User',
                    firstName: 'Query',
                    lastName: 'Employee',
                    email: 'query.employee@test.com',
                    userType: UserType.EMPLOYEE,
                    roleId: consultantRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                const contactUser = await new userModel({
                    recordId: 'QUERY_CONTACT_CRUD',
                    name: 'Query Contact User',
                    firstName: 'Query',
                    lastName: 'Contact',
                    email: 'query.contact@test.com',
                    userType: UserType.CONTACT,
                    roleId: growerRole._id,
                    clientIds: [testClientA._id],
                    isActive: true
                }).save();

                // Act & Assert: Query by userType
                const employeeQuery = await request(app.getHttpServer())
                    .get('/users?userType=employee')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);

                const contactQuery = await request(app.getHttpServer())
                    .get('/users?userType=contact')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);

                // Verify type filtering
                const employeeTypes = employeeQuery.body.map((user: any) => user.userType);
                const contactTypes = contactQuery.body.map((user: any) => user.userType);

                employeeTypes.forEach((type: string) => {
                    expect(type).toBe('employee');
                });

                contactTypes.forEach((type: string) => {
                    expect(type).toBe('contact');
                });

                // Verify specific users are returned
                const employeeIds = employeeQuery.body.map((user: any) => user.recordId);
                const contactIds = contactQuery.body.map((user: any) => user.recordId);

                expect(employeeIds).toContain('QUERY_EMPLOYEE_CRUD');
                expect(contactIds).toContain('QUERY_CONTACT_CRUD');
            });

            it('should handle invalid query parameters gracefully', async () => {
                // Act & Assert: Invalid userType
                const invalidTypeResponse = await request(app.getHttpServer())
                    .get('/users?userType=invalid')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(400); // Should return validation error

                // The error message should mention userType validation
                expect(invalidTypeResponse.body.message).toEqual(
                    expect.arrayContaining([
                        expect.stringContaining('userType')
                    ])
                );
            });
        });
    });
});
