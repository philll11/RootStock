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
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { CreateOrchardDto } from '../../src/orchards/dto/create-orchard.dto';
import { UpdateOrchardDto } from '../../src/orchards/dto/update-orchard.dto';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Orchards Authorization & Multi-Tenant Security - Agricultural Business Scenarios (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models for comprehensive agricultural business testing
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Agricultural business stakeholder tokens - representing real roles
    let platformAdminToken: string;        // Global platform administrator
    let regionManagerToken: string;        // Regional subsidiary manager
    let farmOwnerToken: string;           // Individual farm owner/grower
    let orchardManagerToken: string;      // Orchard-specific manager
    let consultantToken: string;          // Agricultural consultant
    let fieldSupervisorToken: string;     // Field operations supervisor
    let growerContactToken: string;       // External grower contact
    let supplierContactToken: string;     // Equipment/supply vendor contact
    let unauthorizedUserToken: string;    // User with no orchard permissions
    let inactiveUserToken: string;       // Inactive user account
    let crossTenantUserToken: string;     // User from different subsidiary

    // Business entities representing real agricultural operations
    let californiaSubsidiary: SubsidiaryDocument;   // Major agricultural region
    let oregonSubsidiary: SubsidiaryDocument;       // Different agricultural region
    let texasSubsidiary: SubsidiaryDocument;        // Third agricultural region
    let inactiveSubsidiary: SubsidiaryDocument;     // Closed operations
    
    let appleOrchardClient: ClientDocument;         // Premium apple operation
    let citrusGroveClient: ClientDocument;          // Citrus farming operation
    let berryFarmClient: ClientDocument;            // Berry cultivation
    let organicFarmClient: ClientDocument;          // Organic farming operation
    let independentGrowerClient: ClientDocument;    // Small independent grower
    let crossSubsidiaryClient: ClientDocument;      // Multi-region operation
    let inactiveClient: ClientDocument;             // Closed farm operation

    // Business roles for comprehensive agricultural hierarchy
    let globalAdminRole: RoleDocument;       // Platform super admin
    let regionManagerRole: RoleDocument;     // Regional operations manager
    let farmOwnerRole: RoleDocument;         // Farm ownership and management
    let orchardManagerRole: RoleDocument;    // Orchard-specific management
    let consultantRole: RoleDocument;        // Agricultural consulting
    let fieldSupervisorRole: RoleDocument;   // Field operations supervision
    let growerContactRole: RoleDocument;     // External grower contact
    let supplierContactRole: RoleDocument;   // Vendor/supplier contact
    let viewOnlyRole: RoleDocument;         // Read-only access
    let noPermissionsRole: RoleDocument;    // No orchard permissions

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models for comprehensive testing
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        // Create realistic agricultural business subsidiaries
        californiaSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_CA_AG',
            name: 'California Premium Agricultural Solutions',
            isActive: true
        }).save();

        oregonSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_OR_AG',
            name: 'Oregon Fruit Growers Cooperative',
            isActive: true
        }).save();

        texasSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_TX_AG',
            name: 'Texas Agricultural Partners',
            isActive: true
        }).save();

        inactiveSubsidiary = await new subsidiaryModel({
            recordId: 'SUB_INACTIVE_AG',
            name: 'Closed Agricultural Operations Inc',
            isActive: false
        }).save();

        // Create diverse agricultural client operations
        appleOrchardClient = await new clientModel({
            recordId: 'CLI_APPLE_PREMIUM',
            name: 'Premium Apple Orchards of California',
            subsidiaryId: californiaSubsidiary._id,
            isActive: true
        }).save();

        citrusGroveClient = await new clientModel({
            recordId: 'CLI_CITRUS_VALLEY',
            name: 'Valley Citrus Grove Operations',
            subsidiaryId: californiaSubsidiary._id,
            isActive: true
        }).save();

        berryFarmClient = await new clientModel({
            recordId: 'CLI_BERRY_MOUNTAIN',
            name: 'Mountain Berry Farm Collective',
            subsidiaryId: oregonSubsidiary._id,
            isActive: true
        }).save();

        organicFarmClient = await new clientModel({
            recordId: 'CLI_ORGANIC_SUSTAINABLE',
            name: 'Sustainable Organic Farm Alliance',
            subsidiaryId: texasSubsidiary._id,
            isActive: true
        }).save();

        independentGrowerClient = await new clientModel({
            recordId: 'CLI_INDEPENDENT_FAMILY',
            name: 'Independent Family Orchard',
            isActive: true // No subsidiary - independent
        }).save();

        crossSubsidiaryClient = await new clientModel({
            recordId: 'CLI_CROSS_REGION',
            name: 'Cross-Regional Agricultural Holdings',
            subsidiaryId: oregonSubsidiary._id,
            isActive: true
        }).save();

        inactiveClient = await new clientModel({
            recordId: 'CLI_CLOSED_OPERATION',
            name: 'Closed Farm Operations LLC',
            subsidiaryId: inactiveSubsidiary._id,
            isActive: false
        }).save();

        // Create comprehensive agricultural business role hierarchy
        globalAdminRole = await new roleModel({
            recordId: 'ROLE_GLOBAL_ADMIN_ORCHARD',
            name: 'Global Agricultural Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        regionManagerRole = await new roleModel({
            recordId: 'ROLE_REGION_MANAGER_ORCHARD',
            name: 'Regional Agricultural Operations Manager',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_CREATE,
                PERMISSIONS.ORCHARD_EDIT,
                PERMISSIONS.ORCHARD_DELETE,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE,
                PERMISSIONS.USER_EDIT
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        farmOwnerRole = await new roleModel({
            recordId: 'ROLE_FARM_OWNER_ORCHARD',
            name: 'Farm Owner & Agricultural Director',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_CREATE,
                PERMISSIONS.ORCHARD_EDIT,
                PERMISSIONS.ORCHARD_DELETE,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.USER_CREATE
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        orchardManagerRole = await new roleModel({
            recordId: 'ROLE_ORCHARD_MANAGER',
            name: 'Orchard Operations Manager',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_CREATE,
                PERMISSIONS.ORCHARD_EDIT,
                PERMISSIONS.USER_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        consultantRole = await new roleModel({
            recordId: 'ROLE_AGRICULTURAL_CONSULTANT',
            name: 'Agricultural Consultant & Advisor',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        fieldSupervisorRole = await new roleModel({
            recordId: 'ROLE_FIELD_SUPERVISOR',
            name: 'Field Operations Supervisor',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.USER_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        growerContactRole = await new roleModel({
            recordId: 'ROLE_GROWER_CONTACT',
            name: 'External Grower Contact',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        supplierContactRole = await new roleModel({
            recordId: 'ROLE_SUPPLIER_CONTACT',
            name: 'Equipment & Supply Vendor Contact',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        viewOnlyRole = await new roleModel({
            recordId: 'ROLE_VIEW_ONLY',
            name: 'View Only Observer',
            permissions: [
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.CLIENT_VIEW
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        noPermissionsRole = await new roleModel({
            recordId: 'ROLE_NO_ORCHARD_PERMS',
            name: 'No Orchard Access Role',
            permissions: [], // No orchard permissions
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create users representing real agricultural stakeholders
        const platformAdmin = await new userModel({
            recordId: 'ADMIN_PLATFORM_ORCHARD',
            name: 'Global Agricultural Platform Administrator',
            firstName: 'Platform',
            lastName: 'Administrator',
            email: 'admin@rootstock-platform.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id,
            isActive: true
        }).save();
        platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

        const regionManager = await new userModel({
            recordId: 'MGR_CALIFORNIA_ORCHARDS',
            name: 'California Regional Orchard Manager',
            firstName: 'Regional',
            lastName: 'Manager',
            email: 'manager@california-ag.com',
            userType: UserType.EMPLOYEE,
            roleId: regionManagerRole._id,
            clientIds: [appleOrchardClient._id, citrusGroveClient._id],
            isActive: true
        }).save();
        regionManagerToken = jwtService.sign({ sub: regionManager.recordId });

        const farmOwner = await new userModel({
            recordId: 'OWNER_PREMIUM_APPLE',
            name: 'Premium Apple Orchard Owner',
            firstName: 'Farm',
            lastName: 'Owner',
            email: 'owner@premium-apple.com',
            userType: UserType.EMPLOYEE,
            roleId: farmOwnerRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: true
        }).save();
        farmOwnerToken = jwtService.sign({ sub: farmOwner.recordId });

        const orchardManager = await new userModel({
            recordId: 'MGR_ORCHARD_OPERATIONS',
            name: 'Orchard Operations Manager',
            firstName: 'Orchard',
            lastName: 'Manager',
            email: 'operations@premium-apple.com',
            userType: UserType.EMPLOYEE,
            roleId: orchardManagerRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: true
        }).save();
        orchardManagerToken = jwtService.sign({ sub: orchardManager.recordId });

        const consultant = await new userModel({
            recordId: 'CONSULTANT_AGRICULTURAL',
            name: 'Senior Agricultural Consultant',
            firstName: 'Agricultural',
            lastName: 'Consultant',
            email: 'consultant@ag-experts.com',
            userType: UserType.EMPLOYEE,
            roleId: consultantRole._id,
            clientIds: [appleOrchardClient._id, citrusGroveClient._id],
            isActive: true
        }).save();
        consultantToken = jwtService.sign({ sub: consultant.recordId });

        const fieldSupervisor = await new userModel({
            recordId: 'SUPERVISOR_FIELD_OPS',
            name: 'Field Operations Supervisor',
            firstName: 'Field',
            lastName: 'Supervisor',
            email: 'supervisor@premium-apple.com',
            userType: UserType.EMPLOYEE,
            roleId: fieldSupervisorRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: true
        }).save();
        fieldSupervisorToken = jwtService.sign({ sub: fieldSupervisor.recordId });

        const growerContact = await new userModel({
            recordId: 'CONTACT_GROWER_EXTERNAL',
            name: 'External Grower Contact',
            firstName: 'External',
            lastName: 'Grower',
            email: 'grower@external-contact.com',
            userType: UserType.CONTACT,
            roleId: growerContactRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: true
        }).save();
        growerContactToken = jwtService.sign({ sub: growerContact.recordId });

        const supplierContact = await new userModel({
            recordId: 'CONTACT_SUPPLIER_VENDOR',
            name: 'Equipment Supplier Contact',
            firstName: 'Equipment',
            lastName: 'Supplier',
            email: 'supplier@ag-equipment.com',
            userType: UserType.CONTACT,
            roleId: supplierContactRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: true
        }).save();
        supplierContactToken = jwtService.sign({ sub: supplierContact.recordId });

        const unauthorizedUser = await new userModel({
            recordId: 'USER_NO_ORCHARD_PERMS',
            name: 'User Without Orchard Permissions',
            firstName: 'No',
            lastName: 'Permissions',
            email: 'noperms@test-platform.com',
            userType: UserType.EMPLOYEE,
            roleId: noPermissionsRole._id,
            clientIds: [independentGrowerClient._id],
            isActive: true
        }).save();
        unauthorizedUserToken = jwtService.sign({ sub: unauthorizedUser.recordId });

        const inactiveUser = await new userModel({
            recordId: 'USER_INACTIVE_ACCOUNT',
            name: 'Inactive User Account',
            firstName: 'Inactive',
            lastName: 'User',
            email: 'inactive@test-platform.com',
            userType: UserType.EMPLOYEE,
            roleId: farmOwnerRole._id,
            clientIds: [appleOrchardClient._id],
            isActive: false // Inactive user
        }).save();
        inactiveUserToken = jwtService.sign({ sub: inactiveUser.recordId });

        const crossTenantUser = await new userModel({
            recordId: 'USER_CROSS_TENANT',
            name: 'Cross Tenant User',
            firstName: 'Cross',
            lastName: 'Tenant',
            email: 'crosstenant@oregon-berry.com',
            userType: UserType.EMPLOYEE,
            roleId: farmOwnerRole._id,
            clientIds: [berryFarmClient._id], // Different subsidiary
            isActive: true
        }).save();
        crossTenantUserToken = jwtService.sign({ sub: crossTenantUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean orchard data between tests while preserving user/client/role setup
        await orchardModel.deleteMany({});
    });


    describe('Action Permissions (Guard)', () => {
        let testOrchard: OrchardDocument;
        let testClient: ClientDocument;

        beforeEach(async () => {
            // Clean up before each test to avoid duplicate key errors
            await clientModel.deleteMany({ recordId: { $regex: /^C_AUTH_O/ } });
            await orchardModel.deleteMany({ recordId: { $regex: /^O_AUTH/ } });
            
            testClient = await new clientModel({ recordId: 'C_AUTH_O_GUARD', name: 'Auth Client for Guard Tests' }).save();
            testOrchard = await new orchardModel({ recordId: 'O_AUTH_GUARD', name: 'Auth Orchard Guard', clientId: testClient._id }).save();
        });

        afterEach(async () => {
            // Clean up after each test
            await orchardModel.deleteMany({ recordId: { $regex: /^O_AUTH/ } });
            await clientModel.deleteMany({ recordId: { $regex: /^C_AUTH_O/ } });
        });

        it('POST /orchards should FAIL with 403 for user without ORCHARD_CREATE', () => {
            return request(app.getHttpServer()).post('/orchards').set('Authorization', `Bearer ${consultantToken}`) // Consultant lacks ORCHARD_CREATE
                .send({ name: 'FAIL', clientId: testClient._id.toHexString() }).expect(403);
        });
        it('GET /orchards should FAIL with 403 for user without ORCHARD_VIEW', () => {
            return request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${unauthorizedUserToken}`).expect(403);
        });
        it('PATCH /orchards/:id should FAIL with 403 for user without ORCHARD_EDIT', () => {
            return request(app.getHttpServer()).patch(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${consultantToken}`) // Consultant lacks ORCHARD_EDIT
                .send({ name: 'FAIL' }).expect(403);
        });
        it('DELETE /orchards/:id should FAIL with 403 for user without ORCHARD_DELETE', () => {
            return request(app.getHttpServer()).delete(`/orchards/${testOrchard._id}`).set('Authorization', `Bearer ${consultantToken}`) // Consultant lacks ORCHARD_DELETE
                .expect(403);
        });
    });

    describe('Field-Level Permissions', () => {
        it('PATCH /orchards/:id should SUCCEED when updating isActive with ORCHARD_EDIT permission', async () => {
            // Use a client that the orchard manager has access to (appleOrchardClient)
            const orchard = await new orchardModel({ 
                recordId: 'ORCH_FIELD_TEST_UNIQUE', 
                name: 'Field Test Orchard', 
                clientId: appleOrchardClient._id // Orchard manager has access to this client
            }).save();
            
            return request(app.getHttpServer())
                .patch(`/orchards/${orchard._id}`)
                .set('Authorization', `Bearer ${orchardManagerToken}`) // Orchard manager has ORCHARD_EDIT
                .send({ isActive: false })
                .expect(200)
                .then(res => {
                    expect(res.body.isActive).toBe(false);
                });
        });
    });

    describe('Visibility Scope (Data Segregation)', () => {
        let clientUserToken: string;
        let consultantUserToken: string;

        beforeEach(async () => {
            // Clean up test-specific data to avoid conflicts
            await roleModel.deleteMany({ recordId: { $in: ['ROLE_CLIENT_E2E_O', 'ROLE_SUB_E2E_O'] } });
            await userModel.deleteMany({ recordId: { $in: ['CLIENT_USER_O', 'CONSULTANT_USER_O'] } });
            await subsidiaryModel.deleteMany({ recordId: { $in: ['SUB_A_O', 'SUB_B_O'] } });
            await clientModel.deleteMany({ recordId: { $in: ['CLI_A1_O', 'CLI_A2_O', 'CLI_B1_O'] } });
            await orchardModel.deleteMany({ recordId: { $in: ['ORCH_A1', 'ORCH_A2', 'ORCH_B1'] } });

            const subsidiaryA = await new subsidiaryModel({ recordId: 'SUB_A_O', name: 'Subsidiary A' }).save();
            const subsidiaryB = await new subsidiaryModel({ recordId: 'SUB_B_O', name: 'Subsidiary B' }).save();
            const clientA1 = await new clientModel({ recordId: 'CLI_A1_O', name: 'Client A1', subsidiaryId: subsidiaryA._id }).save();
            const clientA2 = await new clientModel({ recordId: 'CLI_A2_O', name: 'Client A2', subsidiaryId: subsidiaryA._id }).save();
            const clientB1 = await new clientModel({ recordId: 'CLI_B1_O', name: 'Client B1', subsidiaryId: subsidiaryB._id }).save();

            // Seed orchards for these clients
            await new orchardModel({ recordId: 'ORCH_A1', name: 'Orchard A1', clientId: clientA1._id }).save();
            await new orchardModel({ recordId: 'ORCH_A2', name: 'Orchard A2', clientId: clientA2 }).save();
            await new orchardModel({ recordId: 'ORCH_B1', name: 'Orchard B1', clientId: clientB1 }).save();

            const clientRole = await new roleModel({ recordId: 'ROLE_CLIENT_E2E_O', name: 'Client Role', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.CLIENT }).save();
            const subsidiaryRole = await new roleModel({ recordId: 'ROLE_SUB_E2E_O', name: 'Subsidiary Role', permissions: [PERMISSIONS.ORCHARD_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY }).save();
            
            const clientUser = await new userModel({ 
                recordId: 'CLIENT_USER_O', 
                name: 'Client Scope User', 
                firstName: 'Client', 
                lastName: 'User',
                email: 'client.scope@test.com',
                userType: UserType.CONTACT, 
                roleId: clientRole._id, 
                clientIds: [clientA1._id] 
            }).save();
            const consultantUser = await new userModel({ 
                recordId: 'CONSULTANT_USER_O', 
                name: 'Sub Scope User', 
                firstName: 'Sub', 
                lastName: 'User',
                email: 'sub.scope@test.com',
                userType: UserType.EMPLOYEE, 
                roleId: subsidiaryRole._id, 
                clientIds: [clientA1._id] 
            }).save();
            
            clientUserToken = jwtService.sign({ sub: clientUser.recordId });
            consultantUserToken = jwtService.sign({ sub: consultantUser.recordId });
        });

        it('should SUCCEED and return ALL orchards for a user with Global scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            expect(response.body).toHaveLength(3);
        });

        it('should SUCCEED and return ONLY assigned orchards for a user with Client scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${clientUserToken}`).expect(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].recordId).toBe('ORCH_A1');
        });

        it('should SUCCEED and return all orchards from the assigned subsidiary for a user with Subsidiary scope', async () => {
            const response = await request(app.getHttpServer()).get('/orchards').set('Authorization', `Bearer ${consultantUserToken}`).expect(200);
            expect(response.body).toHaveLength(2); // Should see ORCH_A1 and ORCH_A2
        });
    });

    describe('Query Filter Permissions', () => {
        it('should FAIL with 403 when a user without VIEW_DELETED permission queries for deleted records', async () => {
            const client = await new clientModel({ recordId: 'C_DEL_FILTER', name: 'Client for Deleted Filter' }).save();
            await new orchardModel({ recordId: 'ORCH_DELETED_AUTH', name: 'Deleted For Auth', clientId: client._id, isDeleted: true, isActive: false }).save();
            
            return request(app.getHttpServer())
                .get('/orchards?isDeleted=true')
                .set('Authorization', `Bearer ${consultantToken}`) // Consultant does not have VIEW_DELETED
                .expect(403);
        });

        it('should SUCCEED when a user with VIEW_DELETED permission queries for deleted records', async () => {
            const client = await new clientModel({ recordId: 'C_DEL_FILTER_2', name: 'Client for Deleted Filter 2' }).save();
            await new orchardModel({ recordId: 'ORCH_DELETED_AUTH_2', name: 'Deleted For Auth 2', clientId: client._id, isDeleted: true, isActive: false }).save();
            
            return request(app.getHttpServer())
                .get('/orchards?isDeleted=true')
                .set('Authorization', `Bearer ${platformAdminToken}`) // Platform Admin has all perms
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThan(0);
                    expect(res.body[0].isDeleted).toBe(true);
                });
        });
    });

    describe('Visibility Scope on Mutations and Nested Routes', () => {
        let clientA: ClientDocument, clientB: ClientDocument, orchardB: OrchardDocument, scopedToken: string;

        beforeEach(async () => {
            // Clean up all test-specific data to avoid duplicate key errors
            await roleModel.deleteMany({ recordId: 'ROLE_SCOPED_TEST_O' });
            await userModel.deleteMany({ recordId: 'USER_SCOPED_TEST_O' });
            await clientModel.deleteMany({ recordId: { $in: ['CLI_AUTH_A_O', 'CLI_AUTH_B_O'] } });
            await orchardModel.deleteMany({ recordId: 'ORCH_AUTH_B' });

            clientA = await new clientModel({ recordId: 'CLI_AUTH_A_O', name: 'Auth Client A' }).save();
            clientB = await new clientModel({ recordId: 'CLI_AUTH_B_O', name: 'Auth Client B' }).save();
            orchardB = await new orchardModel({ recordId: 'ORCH_AUTH_B', name: 'Auth Orchard B', clientId: clientB._id }).save();

            const scopedRole = await new roleModel({ recordId: 'ROLE_SCOPED_TEST_O', name: 'Scoped Role', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT], visibilityScope: VisibilityScope.CLIENT }).save();
            const scopedUser = await new userModel({ 
                recordId: 'USER_SCOPED_TEST_O', 
                name: 'Scoped User', 
                firstName: 'Scoped', 
                lastName: 'User', 
                email: 'scoped.user@test.com',
                userType: UserType.CONTACT, 
                roleId: scopedRole._id, 
                clientIds: [clientA._id] 
            }).save();
            scopedToken = jwtService.sign({ sub: scopedUser.recordId });
        });

        it('PATCH /orchards/:id should FAIL with 404 for an orchard outside the user scope', () => {
            return request(app.getHttpServer())
                .patch(`/orchards/${orchardB._id}`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .send({ name: 'This should not work' })
                .expect(404);
        });

        it('GET /clients/:clientId/orchards should FAIL with 404 for a parent client outside the user scope', () => {
            return request(app.getHttpServer())
                .get(`/clients/${clientB._id}/orchards`)
                .set('Authorization', `Bearer ${scopedToken}`)
                .expect(404);
        });
    });

    describe('Comprehensive Agricultural Business Authorization Scenarios', () => {
        describe('Orchard Update Authorization - Agricultural Management Workflow (PATCH /orchards/:id)', () => {
            let testOrchard: OrchardDocument;
            let crossTenantOrchard: OrchardDocument;

            beforeEach(async () => {
                testOrchard = await new orchardModel({
                    recordId: 'ORC_UPDATE_AUTH_001',
                    name: 'Update Authorization Test Orchard',
                    clientId: appleOrchardClient._id,
                    variety: 'Original Variety',
                    size: 30.0
                }).save();

                crossTenantOrchard = await new orchardModel({
                    recordId: 'ORC_CROSS_UPDATE_001',
                    name: 'Cross Tenant Update Test',
                    clientId: berryFarmClient._id, // Different subsidiary
                    variety: 'Cross Tenant Variety',
                    size: 20.0
                }).save();
            });

            describe('Authorized Orchard Updates', () => {
                it('should allow platform administrators to update any orchard across all subsidiaries', async () => {
                // Arrange: Platform admin updates across agricultural regions
                const updateData: UpdateOrchardDto = {
                    name: 'Platform Admin Updated Premium Apple',
                    isActive: true
                };                    // Act: Platform admin updates orchard
                    const response = await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(updateData)
                        .set('Authorization', `Bearer ${platformAdminToken}`)
                        .expect(200);

                    // Assert: Successful cross-subsidiary update
                    expect(response.body.name).toBe('Platform Admin Updated Premium Apple');
                    expect(response.body.isActive).toBe(true);
                });

                it('should allow farm owners to update their owned orchards with full control', async () => {
                // Arrange: Farm owner updates their agricultural operation
                const ownerUpdateData: UpdateOrchardDto = {
                    name: 'Farm Owner Heritage Apple Premium',
                    isActive: true
                };                    // Act: Farm owner updates owned orchard
                    const response = await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(ownerUpdateData)
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(200);

                    // Assert: Full ownership control exercised
                    expect(response.body.name).toBe('Farm Owner Heritage Apple Premium');
                    expect(response.body.isActive).toBe(true);
                });

                it('should allow orchard managers to update operational aspects within their scope', async () => {
                // Arrange: Orchard manager updates production operations
                const managerUpdateData: UpdateOrchardDto = {
                    name: 'Manager Enhanced Production Block',
                    isActive: true
                };                    // Act: Orchard manager updates operational details
                    const response = await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(managerUpdateData)
                        .set('Authorization', `Bearer ${orchardManagerToken}`)
                        .expect(200);

                    // Assert: Operational management updates successful
                    expect(response.body.name).toBe('Manager Enhanced Production Block');
                    expect(response.body.isActive).toBe(true);
                });

                it('should allow regional managers to update orchards within their client assignments', async () => {
                // Arrange: Regional manager updates assigned client orchard
                const regionalUpdateData: UpdateOrchardDto = {
                    name: 'Regional Manager Enhanced Apple Block',
                    isActive: true
                };                    // Act: Regional manager updates within scope
                    const response = await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(regionalUpdateData)
                        .set('Authorization', `Bearer ${regionManagerToken}`)
                        .expect(200);

                    // Assert: Regional management authority exercised
                    expect(response.body.name).toBe('Regional Manager Enhanced Apple Block');
                    expect(response.body.isActive).toBe(true);
                });
            });

            describe('Unauthorized Orchard Update Prevention', () => {
                it('should prevent consultants from updating orchards (advisory role limitation)', async () => {
                // Arrange: Consultant attempts operational update
                const consultantAttemptData: UpdateOrchardDto = {
                    name: 'Consultant Attempted Update'
                };                    // Act & Assert: Consultant denied update authority
                    await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(consultantAttemptData)
                        .set('Authorization', `Bearer ${consultantToken}`)
                        .expect(403);
                });

                it('should prevent field supervisors from updating orchard-level properties', async () => {
                // Arrange: Field supervisor attempts orchard modification
                const supervisorAttemptData: UpdateOrchardDto = {
                    name: 'Supervisor Attempted Orchard Update'
                };                    // Act & Assert: Field supervisor denied orchard-level updates
                    await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(supervisorAttemptData)
                        .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                        .expect(403);
                });

                it('should prevent external grower contacts from updating orchards', async () => {
                // Arrange: External grower attempts unauthorized update
                const externalGrowerData: UpdateOrchardDto = {
                    name: 'External Grower Attempted Update'
                };                    // Act & Assert: External grower denied update access
                    await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(externalGrowerData)
                        .set('Authorization', `Bearer ${growerContactToken}`)
                        .expect(403);
                });

                it('should prevent supplier contacts from updating orchard properties', async () => {
                // Arrange: Supplier contact attempts unauthorized update
                const supplierAttemptData: UpdateOrchardDto = {
                    name: 'Supplier Attempted Update'
                };                    // Act & Assert: Supplier contact denied update access
                    await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`)
                        .send(supplierAttemptData)
                        .set('Authorization', `Bearer ${supplierContactToken}`)
                        .expect(403);
                });

                it('should enforce cross-tenant update isolation', async () => {
                // Arrange: Cross-tenant user attempts update
                const crossTenantData: UpdateOrchardDto = {
                    name: 'Cross Tenant Unauthorized Update'
                };                    // Act & Assert: Cross-tenant access denied with 404 for data isolation
                    await request(app.getHttpServer())
                        .patch(`/orchards/${testOrchard._id}`) // California orchard
                        .send(crossTenantData)
                        .set('Authorization', `Bearer ${crossTenantUserToken}`) // Oregon user
                        .expect(404);
                });

                it('should prevent farm owners from updating non-owned orchards', async () => {
                // Arrange: Farm owner attempts to update different owner's orchard
                const unauthorizedOwnerData: UpdateOrchardDto = {
                    name: 'Unauthorized Farm Owner Update'
                };                    // Act & Assert: Farm owner denied access to non-owned orchard
                    await request(app.getHttpServer())
                        .patch(`/orchards/${crossTenantOrchard._id}`) // Different owner
                        .send(unauthorizedOwnerData)
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(404);
                });
            });
        });

        describe('Orchard Deletion Authorization - Agricultural Asset Management (DELETE /orchards/:id)', () => {
            let deletionTestOrchard: OrchardDocument;

            beforeEach(async () => {
                deletionTestOrchard = await new orchardModel({
                    recordId: 'ORC_DELETE_AUTH_001',
                    name: 'Deletion Authorization Test Orchard',
                    clientId: appleOrchardClient._id,
                    variety: 'Deletion Test Variety',
                    size: 25.0,
                    isActive: true
                }).save();
            });

            describe('Authorized Asset Deletion', () => {
                it('should allow platform administrators to delete any orchard across subsidiaries', async () => {
                    // Act & Assert: Platform admin can delete any agricultural asset
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${platformAdminToken}`)
                        .expect(200);

                    // Verify soft deletion occurred
                    const deletedOrchard = await orchardModel.findById(deletionTestOrchard._id);
                    expect(deletedOrchard).toBeTruthy();
                    expect(deletedOrchard!.isDeleted).toBe(true);
                    expect(deletedOrchard!.isActive).toBe(false);
                });

                it('should allow regional managers to delete orchards within their regional authority', async () => {
                    // Create fresh orchard for regional manager deletion test
                    const regionalOrchard = await new orchardModel({
                        recordId: 'ORC_REGIONAL_DELETE_001',
                        name: 'Regional Deletion Test Orchard',
                        clientId: appleOrchardClient._id, // Within regional manager's scope
                        variety: 'Regional Test Variety',
                        size: 20.0
                    }).save();

                    // Act & Assert: Regional manager can delete within scope
                    await request(app.getHttpServer())
                        .delete(`/orchards/${regionalOrchard._id}`)
                        .set('Authorization', `Bearer ${regionManagerToken}`)
                        .expect(200);
                });

                it('should allow farm owners to delete their owned orchard assets', async () => {
                    // Create fresh orchard for farm owner deletion test  
                    const ownerOrchard = await new orchardModel({
                        recordId: 'ORC_OWNER_DELETE_001',
                        name: 'Owner Deletion Test Orchard',
                        clientId: appleOrchardClient._id, // Farm owner's property
                        variety: 'Owner Test Variety',
                        size: 18.0
                    }).save();

                    // Act & Assert: Farm owner can delete owned assets
                    await request(app.getHttpServer())
                        .delete(`/orchards/${ownerOrchard._id}`)
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(200);
                });
            });

            describe('Unauthorized Asset Deletion Prevention', () => {
                it('should prevent orchard managers from deleting orchards (operational role limitation)', async () => {
                    // Act & Assert: Orchard manager denied deletion authority
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${orchardManagerToken}`)
                        .expect(403);
                });

                it('should prevent consultants from deleting agricultural assets', async () => {
                    // Act & Assert: Consultant denied deletion access
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${consultantToken}`)
                        .expect(403);
                });

                it('should prevent field supervisors from deleting orchard assets', async () => {
                    // Act & Assert: Field supervisor denied deletion access
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                        .expect(403);
                });

                it('should prevent external contacts from deleting agricultural assets', async () => {
                    // Act & Assert: External grower contact denied deletion
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${growerContactToken}`)
                        .expect(403);

                    // Act & Assert: Supplier contact denied deletion  
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${supplierContactToken}`)
                        .expect(403);
                });

                it('should prevent users without orchard permissions from deletion', async () => {
                    // Act & Assert: Unauthorized user denied deletion access
                    await request(app.getHttpServer())
                        .delete(`/orchards/${deletionTestOrchard._id}`)
                        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
                        .expect(403);
                });

            it('should prevent inactive users from deleting agricultural assets', async () => {
                // Act & Assert: Inactive user denied deletion access
                await request(app.getHttpServer())
                    .delete(`/orchards/${deletionTestOrchard._id}`)
                    .set('Authorization', `Bearer ${inactiveUserToken}`)
                    .expect(401); // Inactive users return 401 (Unauthorized) not 403 (Forbidden)
            });

            it('should enforce cross-tenant deletion isolation', async () => {
                // Act & Assert: Cross-tenant user gets 403 (Forbidden) due to access control
                await request(app.getHttpServer())
                    .delete(`/orchards/${deletionTestOrchard._id}`) // California orchard
                    .set('Authorization', `Bearer ${crossTenantUserToken}`) // Oregon user
                    .expect(403); // Access control prevents deletion
            });
            });
        });

        describe('Advanced Multi-Tenant Security & Agricultural Business Rules', () => {
            describe('Complex Permission Combinations', () => {
                it('should enforce hierarchical permission inheritance in agricultural operations', async () => {
                    // Arrange: Create orchard for complex permission testing
                    const hierarchyTestOrchard = await new orchardModel({
                        recordId: 'ORC_HIERARCHY_TEST_001',
                        name: 'Hierarchy Permission Test Orchard',
                        clientId: appleOrchardClient._id,
                        variety: 'Hierarchy Test Variety'
                    }).save();

                    // Act: Test permission hierarchy - Platform Admin > Regional Manager > Farm Owner
                    
                    // Platform admin should have full access
                    await request(app.getHttpServer())
                        .get(`/orchards/${hierarchyTestOrchard._id}`)
                        .set('Authorization', `Bearer ${platformAdminToken}`)
                        .expect(200);

                    // Regional manager should have scoped access within their region
                    await request(app.getHttpServer())
                        .patch(`/orchards/${hierarchyTestOrchard._id}`)
                        .send({ name: 'Regional management update' })
                        .set('Authorization', `Bearer ${regionManagerToken}`)
                        .expect(200);

                    // Farm owner should have control over owned assets
                    const response = await request(app.getHttpServer())
                        .patch(`/orchards/${hierarchyTestOrchard._id}`)
                        .send({ name: 'Farm owner management decision' })
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(200);

                    // Assert: Changes properly applied through hierarchy
                    expect(response.body.name).toBe('Farm owner management decision');
                });

                it('should prevent privilege escalation attempts in agricultural system', async () => {
                    // Arrange: Test attempts to escalate permissions beyond role authority
                    const escalationTestOrchard = await new orchardModel({
                        recordId: 'ORC_ESCALATION_TEST_001',
                        name: 'Escalation Prevention Test Orchard',
                        clientId: berryFarmClient._id, // Different subsidiary
                        variety: 'Escalation Test Variety'
                    }).save();

                    // Act & Assert: Lower privilege roles cannot access higher privilege resources
                    
                    // Field supervisor should not access orchards outside operational scope
                    await request(app.getHttpServer())
                        .get(`/orchards/${escalationTestOrchard._id}`) // Different subsidiary
                        .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                        .expect(404);

                    // Consultant should not perform management operations beyond advisory scope
                    await request(app.getHttpServer())
                        .delete(`/orchards/${escalationTestOrchard._id}`)
                        .set('Authorization', `Bearer ${consultantToken}`)
                        .expect(403);

                    // External contact should not access management functions
                    await request(app.getHttpServer())
                        .patch(`/orchards/${escalationTestOrchard._id}`)
                        .send({ unauthorizedUpdate: 'Should be prevented' })
                        .set('Authorization', `Bearer ${growerContactToken}`)
                        .expect(403);
                });
            });

            describe('Data Isolation & Agricultural Business Compliance', () => {
                it('should maintain strict data isolation between agricultural subsidiaries', async () => {
                    // Arrange: Create orchards in different agricultural regions/subsidiaries
                    const californiaOrchard = await new orchardModel({
                        recordId: 'ORC_CA_ISOLATION_001',
                        name: 'California Subsidiary Isolated Orchard',
                        clientId: appleOrchardClient._id, // California subsidiary
                        variety: 'California Isolation Variety'
                    }).save();

                    const oregonOrchard = await new orchardModel({
                        recordId: 'ORC_OR_ISOLATION_001',
                        name: 'Oregon Subsidiary Isolated Orchard',
                        clientId: berryFarmClient._id, // Oregon subsidiary
                        variety: 'Oregon Isolation Variety'
                    }).save();

                    const texasOrchard = await new orchardModel({
                        recordId: 'ORC_TX_ISOLATION_001',
                        name: 'Texas Subsidiary Isolated Orchard',
                        clientId: organicFarmClient._id, // Texas subsidiary
                        variety: 'Texas Isolation Variety'
                    }).save();

                    // Act: Test cross-subsidiary data isolation
                    const oregonUserResponse = await request(app.getHttpServer())
                        .get('/orchards')
                        .set('Authorization', `Bearer ${crossTenantUserToken}`) // Oregon user
                        .expect(200);

                    // Assert: User only sees orchards from their subsidiary
                    expect(oregonUserResponse.body.length).toBeGreaterThan(0);
                    const visibleOrchards = oregonUserResponse.body.map(o => o.recordId);
                    expect(visibleOrchards).toContain('ORC_OR_ISOLATION_001'); // Should see Oregon
                    expect(visibleOrchards).not.toContain('ORC_CA_ISOLATION_001'); // Should not see California
                    expect(visibleOrchards).not.toContain('ORC_TX_ISOLATION_001'); // Should not see Texas
                });

                it('should enforce agricultural business compliance rules across tenant boundaries', async () => {
                    // Arrange: Test compliance rules that span organizational boundaries
                    const complianceOrchard = await new orchardModel({
                        recordId: 'ORC_COMPLIANCE_TEST_001',
                        name: 'Agricultural Compliance Test Orchard',
                        clientId: organicFarmClient._id // Organic certification required
                    }).save();

                    // Act: Users from different subsidiaries should not access compliance-restricted orchards
                    await request(app.getHttpServer())
                        .get(`/orchards/${complianceOrchard._id}`)
                        .set('Authorization', `Bearer ${crossTenantUserToken}`) // Different subsidiary user
                        .expect(404); // Data isolation prevents access

                    // Platform admin should access for compliance oversight
                    const adminResponse = await request(app.getHttpServer())
                        .get(`/orchards/${complianceOrchard._id}`)
                        .set('Authorization', `Bearer ${platformAdminToken}`)
                        .expect(200);

                    // Assert: Compliance data properly isolated
                    expect(adminResponse.body.name).toBe('Agricultural Compliance Test Orchard');
                    expect(adminResponse.body.clientId).toBeTruthy();
                });
            });

            describe('Agricultural Business Workflow Authorization', () => {
                it('should enforce proper authorization for seasonal orchard management workflows', async () => {
                    // Arrange: Create orchard for seasonal workflow testing
                    const seasonalOrchard = await new orchardModel({
                        recordId: 'ORC_SEASONAL_WORKFLOW_001',
                        name: 'Seasonal Management Workflow Orchard',
                        clientId: appleOrchardClient._id
                    }).save();

                    // Act: Test role-based seasonal workflow authorization
                    
                    // Farm owner should control seasonal planning decisions
                    const ownerSeasonalUpdate = await request(app.getHttpServer())
                        .patch(`/orchards/${seasonalOrchard._id}`)
                        .send({ 
                            name: 'Early bloom protection strategy'
                        })
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(200);

                    // Orchard manager should implement tactical operations
                    const managerOperationalUpdate = await request(app.getHttpServer())
                        .patch(`/orchards/${seasonalOrchard._id}`)
                        .send({
                            name: 'Manager Enhanced Operations'
                        })
                        .set('Authorization', `Bearer ${orchardManagerToken}`)
                        .expect(200);

                    // Field supervisor should not make strategic decisions
                    await request(app.getHttpServer())
                        .patch(`/orchards/${seasonalOrchard._id}`)
                        .send({ 
                            name: 'Supervisor attempted strategy change'
                        })
                        .set('Authorization', `Bearer ${fieldSupervisorToken}`)
                        .expect(403);

                    // Assert: Proper workflow authorization enforced
                    expect(ownerSeasonalUpdate.body.name).toBe('Early bloom protection strategy');
                    expect(managerOperationalUpdate.body.name).toBe('Manager Enhanced Operations');
                });

                it('should support collaborative agricultural workflows while maintaining security boundaries', async () => {
                    // Arrange: Create orchard for collaborative workflow testing
                    const collaborativeOrchard = await new orchardModel({
                        recordId: 'ORC_COLLABORATIVE_001',
                        name: 'Collaborative Workflow Test Orchard',
                        clientId: appleOrchardClient._id
                    }).save();

                    // Act: Test multi-role collaboration within security boundaries
                    
                    // Farm owner sets strategic direction
                    await request(app.getHttpServer())
                        .patch(`/orchards/${collaborativeOrchard._id}`)
                        .send({ 
                            name: 'Premium export market focus'
                        })
                        .set('Authorization', `Bearer ${farmOwnerToken}`)
                        .expect(200);

                    // Consultant provides advisory input (view and advisory notes only)
                    const consultantView = await request(app.getHttpServer())
                        .get(`/orchards/${collaborativeOrchard._id}`)
                        .set('Authorization', `Bearer ${consultantToken}`)
                        .expect(200);

                    // Consultant cannot modify operational decisions
                    await request(app.getHttpServer())
                        .patch(`/orchards/${collaborativeOrchard._id}`)
                        .send({ 
                            name: 'Consultant attempted operational change'
                        })
                        .set('Authorization', `Bearer ${consultantToken}`)
                        .expect(403);

                    // Orchard manager implements strategic direction
                    const managerImplementation = await request(app.getHttpServer())
                        .patch(`/orchards/${collaborativeOrchard._id}`)
                        .send({
                            name: 'IPM strategy implementation based on consultant advice'
                        })
                        .set('Authorization', `Bearer ${orchardManagerToken}`)
                        .expect(200);

                    // Assert: Collaborative workflow maintains security boundaries
                    expect(consultantView.body.name).toBe('Premium export market focus');
                    expect(managerImplementation.body.name).toBe('IPM strategy implementation based on consultant advice');
                });
            });
        });
    });
});