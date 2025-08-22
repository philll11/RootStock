import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries Authorization - Comprehensive Security Model (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Business personas for realistic authorization testing
    let platformAdminToken: string; // Global admin with all permissions
    let subsidiaryConsultantToken: string; // Subsidiary-scoped agricultural consultant  
    let clientGrowerToken: string; // Client-scoped grower/owner
    let fieldWorkerToken: string; // Limited field worker permissions
    let subsidiaryManagerToken: string; // Subsidiary manager without certain permissions
    let unauthorizedUserToken: string; // User with no subsidiary permissions

    // Test business entities for comprehensive scope testing
    let subsidiaryNorth: SubsidiaryDocument;
    let subsidiarySouth: SubsidiaryDocument;
    let subsidiaryEast: SubsidiaryDocument; // For isolation testing
    
    let clientNorthA: ClientDocument; // Under subsidiaryNorth
    let clientNorthB: ClientDocument; // Under subsidiaryNorth  
    let clientSouthA: ClientDocument; // Under subsidiarySouth
    let clientEastA: ClientDocument; // Under subsidiaryEast (isolated)

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create comprehensive business entity hierarchy for realistic testing
        subsidiaryNorth = await new subsidiaryModel({
            recordId: 'SUB_NORTH',
            name: 'Northern Agriculture Solutions',
            isActive: true,
            isDeleted: false
        }).save();

        subsidiarySouth = await new subsidiaryModel({
            recordId: 'SUB_SOUTH', 
            name: 'Southern Farming Corporation',
            isActive: true,
            isDeleted: false
        }).save();

        subsidiaryEast = await new subsidiaryModel({
            recordId: 'SUB_EAST',
            name: 'Eastern Orchard Management',
            isActive: true,
            isDeleted: false
        }).save();

        // Create client hierarchy under subsidiaries
        clientNorthA = await new clientModel({
            recordId: 'CLI_NORTH_A',
            name: 'Green Valley Orchards',
            subsidiaryId: subsidiaryNorth._id,
            isActive: true,
            isDeleted: false
        }).save();

        clientNorthB = await new clientModel({
            recordId: 'CLI_NORTH_B', 
            name: 'Mountain View Farms',
            subsidiaryId: subsidiaryNorth._id,
            isActive: true,
            isDeleted: false
        }).save();

        clientSouthA = await new clientModel({
            recordId: 'CLI_SOUTH_A',
            name: 'Sunset Fruit Growers',
            subsidiaryId: subsidiarySouth._id,
            isActive: true,
            isDeleted: false
        }).save();

        clientEastA = await new clientModel({
            recordId: 'CLI_EAST_A',
            name: 'Coastal Agriculture Co',
            subsidiaryId: subsidiaryEast._id,
            isActive: true,
            isDeleted: false
        }).save();

        // Create realistic business roles matching actual system personas
        const platformAdminRole = await new roleModel({
            recordId: 'PLATFORM_ADMIN_AUTH',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions including sensitive ones
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryConsultantRole = await new roleModel({
            recordId: 'SUBSIDIARY_CONSULTANT_AUTH',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: No create/edit/delete permissions for subsidiaries
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const clientGrowerRole = await new roleModel({
            recordId: 'CLIENT_GROWER_AUTH',
            name: 'Orchard Grower/Owner',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW, // Can view parent subsidiary
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                // NOTE: Limited subsidiary interaction
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const fieldWorkerRole = await new roleModel({
            recordId: 'FIELD_WORKER_AUTH',
            name: 'Field Worker',
            permissions: [
                // NOTE: No subsidiary permissions at all
                'Spray:Create',
                'Assessment:View'
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const subsidiaryManagerRole = await new roleModel({
            recordId: 'SUBSIDIARY_MANAGER_AUTH',
            name: 'Subsidiary Manager',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.SUBSIDIARY_EDIT,
                // NOTE: No CREATE, DELETE, or STATUS editing
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_CREATE,
                PERMISSIONS.CLIENT_EDIT
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const unauthorizedRole = await new roleModel({
            recordId: 'UNAUTHORIZED_AUTH',
            name: 'Unauthorized User',
            permissions: [], // No subsidiary permissions
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create business persona users
        const platformAdmin = await new userModel({
            recordId: 'PLATFORM_ADMIN_USER',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Administrator',
            email: 'admin@rootstock.com',
            userType: UserType.EMPLOYEE,
            roleId: platformAdminRole._id,
            clientIds: [] // Global access
        }).save();
        platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUBSIDIARY_CONSULTANT_USER',
            name: 'Agricultural Consultant',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@northernag.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryConsultantRole._id,
            clientIds: [clientNorthA._id, clientNorthB._id] // Assigned to North subsidiary clients
        }).save();
        subsidiaryConsultantToken = jwtService.sign({ sub: subsidiaryConsultant.recordId });

        const clientGrowerUser = await new userModel({
            recordId: 'CLIENT_GROWER_USER',
            name: 'Orchard Grower',
            firstName: 'Michael',
            lastName: 'Thompson',
            email: 'mike@greenvalleyorchards.com',
            userType: UserType.CONTACT,
            roleId: clientGrowerRole._id,
            clientIds: [clientNorthA._id] // Only assigned to their own orchard
        }).save();
        clientGrowerToken = jwtService.sign({ sub: clientGrowerUser.recordId });

        const fieldWorkerUser = await new userModel({
            recordId: 'FIELD_WORKER_USER',
            name: 'Field Worker',
            firstName: 'Carlos',
            lastName: 'Rodriguez',
            email: 'carlos@fieldwork.com',
            userType: UserType.CONTACT,
            roleId: fieldWorkerRole._id,
            clientIds: [clientSouthA._id]
        }).save();
        fieldWorkerToken = jwtService.sign({ sub: fieldWorkerUser.recordId });

        const subsidiaryManagerUser = await new userModel({
            recordId: 'SUBSIDIARY_MANAGER_USER',
            name: 'Subsidiary Manager',
            firstName: 'Jessica',
            lastName: 'Davis',
            email: 'jessica@subsidiarymgmt.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id,
            clientIds: []
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: subsidiaryManagerUser.recordId });

        const unauthorizedUser = await new userModel({
            recordId: 'UNAUTHORIZED_USER',
            name: 'Unauthorized User',
            firstName: 'Unauthorized',
            lastName: 'User',
            email: 'unauthorized@example.com',
            userType: UserType.CONTACT,
            roleId: unauthorizedRole._id,
            clientIds: [clientEastA._id] // Has clients but no subsidiary permissions
        }).save();
        unauthorizedUserToken = jwtService.sign({ sub: unauthorizedUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    beforeEach(async () => { 
        // Only clean up test-created subsidiaries, preserve setup entities
        await subsidiaryModel.deleteMany({ 
            recordId: { $nin: ['SUB_NORTH', 'SUB_SOUTH', 'SUB_EAST'] } 
        }); 
    });

    describe('Action-Level Permission Enforcement', () => {
        
        describe('CREATE Permissions', () => {
            it('should allow subsidiary creation for users with SUBSIDIARY_CREATE permission', () => {
                const createDto = { name: 'Admin Created Subsidiary' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(createDto)
                    .expect(201)
                    .then(res => {
                        expect(res.body.name).toBe('Admin Created Subsidiary');
                        expect(res.body).toHaveProperty('recordId');
                    });
            });

            it('should deny subsidiary creation for consultant without CREATE permission', () => {
                const createDto = { name: 'Consultant Attempted Creation' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(createDto)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toMatch('You do not have the required permissions to perform this action.');
                    });
            });

            it('should deny subsidiary creation for grower without CREATE permission', () => {
                const createDto = { name: 'Grower Attempted Creation' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(createDto)
                    .expect(403);
            });

            it('should deny subsidiary creation for field worker without any subsidiary permissions', () => {
                const createDto = { name: 'Worker Attempted Creation' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .send(createDto)
                    .expect(403);
            });

            it('should deny subsidiary creation for completely unauthorized user', () => {
                const createDto = { name: 'Unauthorized Creation' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                    .send(createDto)
                    .expect(403);
            });
        });

        describe('VIEW Permissions', () => {
            it('should allow subsidiary viewing for users with SUBSIDIARY_VIEW permission', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`) // Has VIEW permission
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Northern Agriculture Solutions');
                    });
            });

            it('should deny subsidiary viewing for field worker without VIEW permission', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`) // No SUBSIDIARY_VIEW
                    .expect(403);
            });

            it('should deny subsidiary viewing for unauthorized user', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                    .expect(403);
            });
        });

        describe('EDIT Permissions', () => {
            let editableSubsidiaryAdmin: SubsidiaryDocument;
            let editableSubsidiaryManager: SubsidiaryDocument;

            beforeEach(async () => {
                editableSubsidiaryAdmin = await new subsidiaryModel({
                    recordId: 'SUB_EDITABLE_ADMIN',
                    name: 'Admin Editable Subsidiary',
                    isActive: true,
                    isDeleted: false
                }).save();

                editableSubsidiaryManager = await new subsidiaryModel({
                    recordId: 'SUB_EDITABLE_MANAGER',
                    name: 'Manager Editable Subsidiary',
                    isActive: true,
                    isDeleted: false
                }).save();
            });

            it('should allow subsidiary editing for users with SUBSIDIARY_EDIT permission', () => {
                const updateDto = { name: 'Admin Updated Subsidiary' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${editableSubsidiaryAdmin._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(updateDto)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Admin Updated Subsidiary');
                    });
            });

            it('should allow basic field editing for subsidiary manager', () => {
                const updateDto = { name: 'Manager Updated Name' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${editableSubsidiaryManager._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .send(updateDto)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Manager Updated Name');
                    });
            });

            it('should deny subsidiary editing for consultant without EDIT permission', () => {
                const updateDto = { name: 'Consultant Attempted Update' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .send(updateDto)
                    .expect(403);
            });

            it('should deny subsidiary editing for grower without EDIT permission', () => {
                const updateDto = { name: 'Grower Attempted Update' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .send(updateDto)
                    .expect(403);
            });
        });

        describe('DELETE Permissions', () => {
            let deletableSubsidiary: SubsidiaryDocument;

            beforeEach(async () => {
                deletableSubsidiary = await new subsidiaryModel({
                    recordId: 'SUB_DELETABLE',
                    name: 'Deletable Test Subsidiary',
                    isActive: true,
                    isDeleted: false
                }).save();
            });

            it('should allow subsidiary deletion for users with SUBSIDIARY_DELETE permission', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${deletableSubsidiary._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.isDeleted).toBe(true);
                        expect(res.body.isActive).toBe(false);
                    });
            });

            it('should deny subsidiary deletion for subsidiary manager without DELETE permission', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${deletableSubsidiary._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                    .expect(403);
            });

            it('should deny subsidiary deletion for consultant without DELETE permission', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${deletableSubsidiary._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403);
            });
        });
    });

    describe('Field-Level Permission Enforcement', () => {
        
        let testSubsidiary: SubsidiaryDocument;

        beforeEach(async () => {
            testSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_FIELD_TEST',
                name: 'Field Permission Test',
                isActive: true,
                isDeleted: false
            }).save();
        });

        it('should allow isActive status updates for users with SUBSIDIARY_EDIT_STATUS permission', () => {
            const statusUpdateDto = { isActive: false };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`) // Has STATUS permission
                .send(statusUpdateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(false);
                });
        });

        it('should deny isActive status updates for subsidiary manager without STATUS permission', () => {
            const statusUpdateDto = { isActive: false };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`) // No STATUS permission
                .send(statusUpdateDto)
                .expect(403)
                .then(res => {
                    expect(res.body.message).toMatch(/permission.*isActive.*status/i);
                });
        });

        it('should allow non-status field updates for manager without STATUS permission', () => {
            const nameUpdateDto = { name: 'Manager Updated Name' };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${testSubsidiary._id}`)
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`)
                .send(nameUpdateDto)
                .expect(200)
                .then(res => {
                    expect(res.body.name).toBe('Manager Updated Name');
                    expect(res.body.isActive).toBe(true); // Should remain unchanged
                });
        });
    });

    describe('Visibility Scope Enforcement - Real Business Scenarios', () => {

        describe('Global Scope - Platform Administrator', () => {
            it('should return ALL subsidiaries for platform admin with Global scope', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(3); // All 3 test subsidiaries
                        const names = res.body.map(sub => sub.name).sort();
                        expect(names).toContain('Northern Agriculture Solutions');
                        expect(names).toContain('Southern Farming Corporation');
                        expect(names).toContain('Eastern Orchard Management');
                    });
            });

            it('should allow platform admin to access any subsidiary directly', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryEast._id}`) // Any subsidiary
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Eastern Orchard Management');
                    });
            });
        });

        describe('Subsidiary Scope - Agricultural Consultant', () => {
            it('should return ONLY parent subsidiaries for consultant with Subsidiary scope', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`) // Assigned to North clients
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1); // Only Northern subsidiary
                        expect(res.body[0].name).toBe('Northern Agriculture Solutions');
                    });
            });

            it('should allow consultant to access their assigned subsidiary', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`) // Their subsidiary
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Northern Agriculture Solutions');
                    });
            });

            it('should deny consultant access to subsidiaries outside their scope', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiarySouth._id}`) // Different subsidiary
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(404) // Should appear as "not found" due to security filter
                    .then(res => {
                        expect(res.body.message).toMatch(/not found.*permission/i);
                    });
            });
        });

        describe('Client Scope - Grower/Owner', () => {
            it('should return ONLY parent subsidiary for grower with Client scope', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${clientGrowerToken}`) // Assigned to North client
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1); // Only their parent subsidiary
                        expect(res.body[0].name).toBe('Northern Agriculture Solutions');
                    });
            });

            it('should allow grower to access their parent subsidiary', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`) // Their parent subsidiary
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Northern Agriculture Solutions');
                    });
            });

            it('should deny grower access to unrelated subsidiaries', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiarySouth._id}`) // Unrelated subsidiary
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404);
            });

            it('should deny grower access to sibling subsidiaries', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryEast._id}`) // Sibling subsidiary
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(404);
            });
        });

        describe('Isolated Scope Testing - Cross-Boundary Violations', () => {
            it('should prevent any cross-subsidiary data leakage in listings', async () => {
                // Test each user can only see their assigned subsidiaries
                const consultantResponse = await request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(200);

                const growerResponse = await request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(200);

                // Consultant sees North, Grower sees North
                expect(consultantResponse.body).toHaveLength(1);
                expect(growerResponse.body).toHaveLength(1);
                expect(consultantResponse.body[0].recordId).toBe('SUB_NORTH');
                expect(growerResponse.body[0].recordId).toBe('SUB_NORTH');

                // Neither should see South or East
                const allVisibleIds = [
                    ...consultantResponse.body.map(s => s.recordId),
                    ...growerResponse.body.map(s => s.recordId)
                ];
                expect(allVisibleIds).not.toContain('SUB_SOUTH');
                expect(allVisibleIds).not.toContain('SUB_EAST');
            });

            it('should maintain scope isolation even with complex client assignments', async () => {
                // Create a user with mixed client assignments spanning subsidiaries
                const mixedRole = await new roleModel({
                    recordId: 'MIXED_SCOPE_ROLE',
                    name: 'Mixed Scope User',
                    permissions: [PERMISSIONS.SUBSIDIARY_VIEW],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                const mixedUser = await new userModel({
                    recordId: 'MIXED_SCOPE_USER',
                    name: 'Mixed Scope User',
                    firstName: 'Mixed',
                    lastName: 'Scope',
                    email: 'mixed@test.com',
                    userType: UserType.CONTACT,
                    roleId: mixedRole._id,
                    clientIds: [clientNorthA._id, clientSouthA._id] // Clients from different subsidiaries
                }).save();

                const mixedToken = jwtService.sign({ sub: mixedUser.recordId });

                // Should see both parent subsidiaries
                const response = await request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${mixedToken}`)
                    .expect(200);

                expect(response.body).toHaveLength(2);
                const subsidiaryIds = response.body.map(s => s.recordId).sort();
                expect(subsidiaryIds).toEqual(['SUB_NORTH', 'SUB_SOUTH']);

                // But should NOT see the isolated East subsidiary
                expect(subsidiaryIds).not.toContain('SUB_EAST');

                // Clean up test entities
                await userModel.findByIdAndDelete(mixedUser._id);
                await roleModel.findByIdAndDelete(mixedRole._id);
            });
        });

        describe('Edge Case Scope Testing', () => {
            it('should return empty array for user with Client scope but no assigned clients', async () => {
                // Create user with Client scope but empty clientIds array
                const emptyRole = await new roleModel({
                    recordId: 'EMPTY_CLIENT_ROLE',
                    name: 'Empty Client Role',
                    permissions: [PERMISSIONS.SUBSIDIARY_VIEW],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                const emptyUser = await new userModel({
                    recordId: 'EMPTY_CLIENT_USER',
                    name: 'Empty Client User',
                    firstName: 'Empty',
                    lastName: 'Client',
                    email: 'empty@test.com',
                    userType: UserType.CONTACT,
                    roleId: emptyRole._id,
                    clientIds: [] // No clients assigned
                }).save();

                const emptyToken = jwtService.sign({ sub: emptyUser.recordId });

                const response = await request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${emptyToken}`)
                    .expect(200);

                expect(response.body).toHaveLength(0);

                // Clean up
                await userModel.findByIdAndDelete(emptyUser._id);
                await roleModel.findByIdAndDelete(emptyRole._id);
            });

            it('should deny access to individual subsidiaries for unassigned Client-scope user', async () => {
                const emptyRole = await new roleModel({
                    recordId: 'EMPTY_INDIVIDUAL_ROLE',
                    name: 'Empty Individual Role',
                    permissions: [PERMISSIONS.SUBSIDIARY_VIEW],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                const emptyUser = await new userModel({
                    recordId: 'EMPTY_INDIVIDUAL_USER',
                    name: 'Empty Individual User',
                    firstName: 'Empty',
                    lastName: 'Individual',
                    email: 'empty-individual@test.com',
                    userType: UserType.CONTACT,
                    roleId: emptyRole._id,
                    clientIds: [] // No clients assigned
                }).save();

                const emptyToken = jwtService.sign({ sub: emptyUser.recordId });

                // Should be denied access to any subsidiary
                await request(app.getHttpServer())
                    .get(`/subsidiaries/${subsidiaryNorth._id}`)
                    .set('Authorization', `Bearer ${emptyToken}`)
                    .expect(404);

                // Clean up
                await userModel.findByIdAndDelete(emptyUser._id);
                await roleModel.findByIdAndDelete(emptyRole._id);
            });
        });
    });

    describe('Authentication and Authorization Boundaries', () => {

        it('should require valid JWT token for any subsidiary operation', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries')
                .expect(401);
        });

        it('should reject malformed JWT tokens', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries')
                .set('Authorization', 'Bearer invalid-jwt-token')
                .expect(401);
        });

        it('should reject expired or invalid user context', async () => {
            // Create a token for a non-existent user
            const fakeToken = jwtService.sign({ sub: 'NON_EXISTENT_USER' });
            
            return request(app.getHttpServer())
                .get('/subsidiaries')
                .set('Authorization', `Bearer ${fakeToken}`)
                .expect(401);
        });

        it('should properly handle missing authorization header', () => {
            return request(app.getHttpServer())
                .post('/subsidiaries')
                .send({ name: 'Unauthorized Creation' })
                .expect(401);
        });

        it('should enforce permission checks even for valid authentication', () => {
            // Field worker has valid auth but no subsidiary permissions
            return request(app.getHttpServer())
                .get('/subsidiaries')
                .set('Authorization', `Bearer ${fieldWorkerToken}`)
                .expect(403)
                .then(res => {
                    expect(res.body.message).toMatch(/permission.*denied|forbidden|required permissions/i);
                });
        });
    });
});