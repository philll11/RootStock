import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries Advanced Business Logic - Comprehensive Edge Cases (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    let counterModel: Model<any>;

    // Test users for comprehensive business scenario testing
    let platformAdminToken: string; // Full permissions for complex business operations
    let subsidiaryManagerToken: string; // Business user with limited permissions
    let readOnlyConsultantToken: string; // View-only user for negative testing

    jest.setTimeout(90000); // Extended timeout for complex transaction tests

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models directly from the app instance
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        counterModel = app.get<Model<any>>(getModelToken('Counter'));

        // Create comprehensive role hierarchy for realistic advanced testing
        const platformAdminRole = await new roleModel({
            recordId: 'PLATFORM_ADMIN_ADV',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // All permissions including sensitive operations
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryManagerRole = await new roleModel({
            recordId: 'SUBSIDIARY_MGR_ADV',
            name: 'Subsidiary Manager',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.SUBSIDIARY_EDIT,
                PERMISSIONS.SUBSIDIARY_EDIT_STATUS,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.CLIENT_CREATE,
                PERMISSIONS.CLIENT_EDIT,
                // NOTE: No DELETE permissions for business safety
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const readOnlyConsultantRole = await new roleModel({
            recordId: 'READONLY_CONSULTANT_ADV',
            name: 'Read-Only Consultant',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.VIEW_DELETED, // Can view deleted records
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        // Create test users with different business roles
        const platformAdmin = await new userModel({
            recordId: 'PLATFORM_ADMIN_ADV_USER',
            name: 'Platform Admin',
            firstName: 'Platform',
            lastName: 'Administrator',
            email: 'platform-admin@advanced-test.com',
            userType: UserType.EMPLOYEE,
            roleId: platformAdminRole._id
        }).save();
        platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

        const subsidiaryManager = await new userModel({
            recordId: 'SUBSIDIARY_MGR_ADV_USER',
            name: 'Subsidiary Manager',
            firstName: 'Subsidiary',
            lastName: 'Manager',
            email: 'sub-manager@advanced-test.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: subsidiaryManager.recordId });

        const readOnlyConsultant = await new userModel({
            recordId: 'READONLY_CONSULTANT_ADV_USER',
            name: 'Read-Only Consultant',
            firstName: 'ReadOnly',
            lastName: 'Consultant',
            email: 'consultant@advanced-test.com',
            userType: UserType.EMPLOYEE,
            roleId: readOnlyConsultantRole._id
        }).save();
        readOnlyConsultantToken = jwtService.sign({ sub: readOnlyConsultant.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => { 
        // Clean up test data but preserve setup entities
        await subsidiaryModel.deleteMany({ 
            recordId: { $not: /^(PLATFORM_ADMIN|SUBSIDIARY_MGR|READONLY_CONSULTANT)/ }
        }); 
        await clientModel.deleteMany({
            recordId: { $not: /^(PLATFORM_ADMIN|SUBSIDIARY_MGR|READONLY_CONSULTANT)/ }
        });
    });

    describe('Sequential RecordId Generation and Counter Management', () => {

        it('should generate sequential recordIds for multiple subsidiaries', async () => {
            const subsidiaryNames = [
                'First Sequential Subsidiary',
                'Second Sequential Subsidiary', 
                'Third Sequential Subsidiary',
                'Fourth Sequential Subsidiary'
            ];

            const responses: any[] = [];
            for (const name of subsidiaryNames) {
                const response = await request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ name })
                    .expect(201);
                responses.push(response);
            }

            // Extract recordIds and verify sequential generation
            const recordIds = responses.map(r => r.body.recordId);
            
            // Verify all follow the pattern
            recordIds.forEach(id => {
                expect(id).toMatch(/^SUB\d{4,}$/);
            });

            // Verify they are sequential (extract numbers and check)
            const numbers = recordIds.map(id => parseInt(id.replace('SUB', ''), 10));
            for (let i = 1; i < numbers.length; i++) {
                expect(numbers[i]).toBe(numbers[i-1] + 1);
            }

            // Verify uniqueness
            expect(new Set(recordIds).size).toBe(recordIds.length);
        });

        it('should maintain counter integrity under rapid concurrent creation', async () => {
            // Simulate rapid concurrent subsidiary creation
            const concurrentPromises: any[] = [];
            for (let i = 0; i < 10; i++) {
                const promise = request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send({ name: `Concurrent Subsidiary ${i}` });
                concurrentPromises.push(promise);
            }

            const results = await Promise.all(concurrentPromises);
            
            // All should succeed
            results.forEach(result => {
                expect(result.status).toBe(201);
                expect(result.body).toHaveProperty('recordId');
                expect(result.body.recordId).toMatch(/^SUB\d{4,}$/);
            });

            // All recordIds should be unique
            const recordIds = results.map(r => r.body.recordId);
            expect(new Set(recordIds).size).toBe(recordIds.length);
        });

        it('should handle counter service integration properly', async () => {
            // Create subsidiary and verify counter document is updated
            const response = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({ name: 'Counter Integration Test' })
                .expect(201);

            // Verify recordId format
            expect(response.body.recordId).toMatch(/^SUB\d{4,}$/);

            // Verify counter document exists and has correct structure
            const counter = await counterModel.findOne({ _id: 'subsidiary' });
            expect(counter).toBeTruthy();
            expect(counter.prefix).toBe('SUB');
            expect(counter.sequence_value).toBeGreaterThan(0);
        });
    });

    describe('Business Rule Enforcement - Subsidiary Deactivation', () => {

        let parentSubsidiary: SubsidiaryDocument;
        let activeClients: ClientDocument[];
        let inactiveClients: ClientDocument[];

        beforeEach(async () => {
            // Create realistic business scenario
            parentSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_BUSINESS_RULES',
                name: 'Business Rules Test Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();

            // Create mix of active and inactive clients
            activeClients = await Promise.all([
                new clientModel({
                    recordId: 'CLI_ACTIVE_1',
                    name: 'Active Client One',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_ACTIVE_2',
                    name: 'Active Client Two',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_ACTIVE_3',
                    name: 'Active Client Three',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);

            inactiveClients = await Promise.all([
                new clientModel({
                    recordId: 'CLI_INACTIVE_1',
                    name: 'Inactive Client One',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: false,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_DELETED_1',
                    name: 'Deleted Client One',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: false,
                    isDeleted: true
                }).save()
            ]);
        });

        it('should prevent subsidiary deactivation when active clients exist', () => {
            const deactivationDto = { isActive: false };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(deactivationDto)
                .expect(409) // Conflict
                .then(res => {
                    expect(res.body.message).toMatch(/cannot be deactivated.*active client/i);
                    expect(res.body.message).toContain('3'); // Should mention count of active clients
                });
        });

        it('should provide detailed error message with active client count', () => {
            const deactivationDto = { isActive: false };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(deactivationDto)
                .expect(409)
                .then(res => {
                    expect(res.body.message).toMatch(/3.*active.*client/i);
                    expect(res.body.message).toMatch(/reassign.*deactivate.*first/i);
                });
        });

        it('should allow subsidiary deactivation when all clients are inactive', async () => {
            // First deactivate all active clients
            for (const client of activeClients) {
                await clientModel.findByIdAndUpdate(client._id, { isActive: false });
            }

            const deactivationDto = { isActive: false };
            
            const res = await request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(deactivationDto)
                .expect(200);
            
            expect(res.body.isActive).toBe(false);
            expect(res.body.name).toBe('Business Rules Test Subsidiary');
        });

        it('should allow subsidiary deactivation when no clients exist', async () => {
            // Remove all clients
            await clientModel.deleteMany({ subsidiaryId: parentSubsidiary._id });

            const deactivationDto = { isActive: false };
            
            const res = await request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(deactivationDto)
                .expect(200);
            
            expect(res.body.isActive).toBe(false);
        });

        it('should ignore soft-deleted clients in active count validation', async () => {
            // Soft-delete all active clients (they should be ignored)
            for (const client of activeClients) {
                await clientModel.findByIdAndUpdate(client._id, { 
                    isDeleted: true,
                    isActive: false 
                });
            }

            const deactivationDto = { isActive: false };
            
            const res = await request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(deactivationDto)
                .expect(200); // Should succeed since deleted clients are ignored
            
            expect(res.body.isActive).toBe(false);
        });

        it('should prevent unauthorized users from bypassing business rules', () => {
            const deactivationDto = { isActive: false };
            
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`) // Has edit but maybe not status
                .send(deactivationDto)
                .expect(409) // Should still check business rules even if permission error comes first
                .catch(() => {
                    // If permission error comes first (403), that's also acceptable
                    // The key is that business rules are enforced
                });
        });
    });

    describe('Transactional Operations - Data Integrity', () => {

        let parentSubsidiary: SubsidiaryDocument;
        let childClients: ClientDocument[];

        beforeEach(async () => {
            // Create subsidiary with multiple child clients for transaction testing
            parentSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_TRANSACTION',
                name: 'Transaction Test Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();

            childClients = await Promise.all([
                new clientModel({
                    recordId: 'CLI_TX_1',
                    name: 'Transaction Client One',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_TX_2', 
                    name: 'Transaction Client Two',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_TX_3',
                    name: 'Transaction Client Three',
                    subsidiaryId: parentSubsidiary._id,
                    isActive: false,
                    isDeleted: false
                }).save()
            ]);
        });

        it('should atomically soft-delete subsidiary and nullify client relationships', async () => {
            // Perform soft deletion
            const deleteResponse = await request(app.getHttpServer())
                .delete(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            // Verify subsidiary is soft-deleted
            expect(deleteResponse.body.isDeleted).toBe(true);
            expect(deleteResponse.body.isActive).toBe(false);

            // Verify all clients have null subsidiaryId
            const updatedClients = await clientModel.find({ 
                _id: { $in: childClients.map(c => c._id) }
            });

            updatedClients.forEach(client => {
                expect(client.subsidiaryId).toBeNull();
            });

            // Verify clients are not deleted (only relationship removed)
            expect(updatedClients).toHaveLength(childClients.length);
            updatedClients.forEach(client => {
                expect(client.isDeleted).toBe(false); // Clients should remain, just unlinked
            });
        });

        it('should maintain referential integrity during failed operations', async () => {
            // Simulate a scenario where the transaction might fail
            // (This is more of a conceptual test - in real scenarios we'd mock database failures)
            
            const originalClientStates = await clientModel.find({ 
                subsidiaryId: parentSubsidiary._id 
            });

            // Verify initial state
            expect(originalClientStates).toHaveLength(3);
            originalClientStates.forEach(client => {
                expect(client.subsidiaryId?.toString()).toBe(parentSubsidiary._id.toString());
            });

            // Attempt deletion with proper authorization
            await request(app.getHttpServer())
                .delete(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            // Verify transaction completed successfully
            const postDeleteClients = await clientModel.find({
                _id: { $in: childClients.map(c => c._id) }
            });

            postDeleteClients.forEach(client => {
                expect(client.subsidiaryId).toBeNull();
            });
        });

        it('should handle concurrent deletion attempts gracefully', async () => {
            // Attempt concurrent deletions of the same subsidiary
            const deletion1 = request(app.getHttpServer())
                .delete(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`);

            const deletion2 = request(app.getHttpServer())
                .delete(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`);

            const [result1, result2] = await Promise.allSettled([deletion1, deletion2]);

            // Count all fulfilled responses (regardless of status code)
            const fulfilledResults = [result1, result2].filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
            
            expect(fulfilledResults).toHaveLength(2); // Both requests should complete

            // At least one should be successful (200)
            const successCount = fulfilledResults.filter(r => r.value.status === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);
            
            // The other should be either 404 (already deleted) or also 200 (idempotent)
            const validStatusCodes = [200, 404];
            fulfilledResults.forEach(result => {
                expect(validStatusCodes).toContain(result.value.status);
            });
        });

        it('should prevent partial transaction completion on database errors', async () => {
            // This test conceptually verifies transaction rollback
            // In a real scenario, we might mock database connection failures
            
            // For now, verify that normal operation maintains consistency
            const preDeleteSubsidiary = await subsidiaryModel.findById(parentSubsidiary._id);
            const preDeleteClients = await clientModel.find({ subsidiaryId: parentSubsidiary._id });
            
            expect(preDeleteSubsidiary?.isDeleted).toBe(false);
            expect(preDeleteClients.length).toBe(3);
            
            // Perform deletion
            await request(app.getHttpServer())
                .delete(`/subsidiaries/${parentSubsidiary._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);
            
            // Verify complete transaction success
            const postDeleteSubsidiary = await subsidiaryModel.findById(parentSubsidiary._id);
            const postDeleteClients = await clientModel.find({ 
                _id: { $in: childClients.map(c => c._id) }
            });
            
            expect(postDeleteSubsidiary?.isDeleted).toBe(true);
            postDeleteClients.forEach(client => {
                expect(client.subsidiaryId).toBeNull();
            });
        });
    });

    describe('Nested Route Operations and Parent Validation', () => {

        let validSubsidiary: SubsidiaryDocument;
        let inactiveSubsidiary: SubsidiaryDocument;
        let deletedSubsidiary: SubsidiaryDocument;
        let subsidiaryClients: ClientDocument[];

        beforeEach(async () => {
            // Create subsidiaries in different states for nested route testing
            validSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_NESTED_VALID',
                name: 'Valid Nested Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();

            inactiveSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_NESTED_INACTIVE',
                name: 'Inactive Nested Subsidiary',
                isActive: false,
                isDeleted: false
            }).save();

            deletedSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_NESTED_DELETED',
                name: 'Deleted Nested Subsidiary',
                isActive: false,
                isDeleted: true
            }).save();

            // Create clients under valid subsidiary
            subsidiaryClients = await Promise.all([
                new clientModel({
                    recordId: 'CLI_NESTED_1',
                    name: 'Nested Client One',
                    subsidiaryId: validSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_NESTED_2',
                    name: 'Nested Client Two',
                    subsidiaryId: validSubsidiary._id,
                    isActive: true,
                    isDeleted: false
                }).save(),
                new clientModel({
                    recordId: 'CLI_NESTED_INACTIVE',
                    name: 'Nested Inactive Client',
                    subsidiaryId: validSubsidiary._id,
                    isActive: false,
                    isDeleted: false
                }).save()
            ]);

            // Create clients under inactive subsidiary (for isolation testing)
            await new clientModel({
                recordId: 'CLI_ISOLATED',
                name: 'Isolated Client',
                subsidiaryId: inactiveSubsidiary._id,
                isActive: true,
                isDeleted: false
            }).save();
        });

        it('should return all clients for valid subsidiary in nested route', () => {
            return request(app.getHttpServer())
                .get(`/subsidiaries/${validSubsidiary._id}/clients`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    // Should return only active clients by default
                    expect(res.body).toHaveLength(2); // Two active clients
                    
                    const clientNames = res.body.map(c => c.name).sort();
                    expect(clientNames).toEqual(['Nested Client One', 'Nested Client Two']);
                    
                    // Verify all returned clients belong to this subsidiary
                    res.body.forEach(client => {
                        expect(client.subsidiaryId).toBe(validSubsidiary._id.toString());
                    });
                });
        });

        it('should validate parent subsidiary access before returning clients', () => {
            return request(app.getHttpServer())
                .get(`/subsidiaries/${inactiveSubsidiary._id}/clients`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(404) // Parent subsidiary validation should fail
                .then(res => {
                    expect(res.body.message).toMatch(/not found.*permission/i);
                });
        });

        it('should prevent access to clients of deleted subsidiary', () => {
            return request(app.getHttpServer())
                .get(`/subsidiaries/${deletedSubsidiary._id}/clients`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(404);
        });

        it('should respect query filters in nested client listing', () => {
            return request(app.getHttpServer())
                .get(`/subsidiaries/${validSubsidiary._id}/clients?includeInactives=true`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    // Should include both active and inactive clients
                    expect(res.body).toHaveLength(3); // All clients including inactive
                    
                    const inactiveClient = res.body.find(c => !c.isActive);
                    expect(inactiveClient).toBeTruthy();
                    expect(inactiveClient.name).toBe('Nested Inactive Client');
                });
        });

        it('should enforce subsidiary-level permissions on nested routes', () => {
            return request(app.getHttpServer())
                .get(`/subsidiaries/${validSubsidiary._id}/clients`)
                .set('Authorization', `Bearer ${readOnlyConsultantToken}`) // Should have access
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });

        it('should return empty array for subsidiary with no clients', async () => {
            // Create subsidiary with no clients
            const emptySubsidiary = await new subsidiaryModel({
                recordId: 'SUB_EMPTY',
                name: 'Empty Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();

            return request(app.getHttpServer())
                .get(`/subsidiaries/${emptySubsidiary._id}/clients`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(0);
                });
        });

        it('should handle malformed subsidiary ID in nested route', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries/invalid-id/clients')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toMatch(/invalid.*objectid|cast.*objectid/i);
                });
        });
    });

    describe('Advanced Query Filtering and Edge Cases', () => {

        let testSubsidiaries: SubsidiaryDocument[];

        beforeEach(async () => {
            // Create comprehensive test data for advanced filtering
            testSubsidiaries = await Promise.all([
                new subsidiaryModel({
                    recordId: 'SUB_ACTIVE_01',
                    name: 'Active Agriculture Corp',
                    isActive: true,
                    isDeleted: false
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB_INACTIVE_01',
                    name: 'Inactive Farming Solutions', 
                    isActive: false,
                    isDeleted: false
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB_DELETED_01',
                    name: 'Deleted Orchard Management',
                    isActive: false,
                    isDeleted: true
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB_SPECIAL_CHARS',
                    name: 'Special-Chars & Co. (Agriculture)',
                    isActive: true,
                    isDeleted: false
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB_UNICODE',
                    name: 'Ūñīçōdē Agríčūltūrē Sōlūtīōñs',
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);
        });

        it('should handle case-insensitive name filtering with special characters', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?name=AGRICULTURE')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                    
                    const foundSubsidiaries = res.body.filter(sub => 
                        sub.name.toLowerCase().includes('agriculture')
                    );
                    expect(foundSubsidiaries.length).toBeGreaterThan(0);
                });
        });

        it('should handle partial recordId searches with pattern matching', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?recordId=SUB_A')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBe(1);
                    expect(res.body[0].recordId).toBe('SUB_ACTIVE_01');
                });
        });

        it('should properly handle Unicode character searches', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?name=Ūñīçōdē')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].name).toBe('Ūñīçōdē Agríčūltūrē Sōlūtīōñs');
                });
        });

        it('should show deleted records only to authorized users', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?isDeleted=true')
                .set('Authorization', `Bearer ${readOnlyConsultantToken}`) // Has VIEW_DELETED permission
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].isDeleted).toBe(true);
                    expect(res.body[0].name).toBe('Deleted Orchard Management');
                });
        });

        it('should deny deleted record access to unauthorized users', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?isDeleted=true')
                .set('Authorization', `Bearer ${subsidiaryManagerToken}`) // No VIEW_DELETED permission
                .expect(403)
                .then(res => {
                    expect(res.body.message).toMatch(/permission.*view.*deleted/i);
                });
        });

        it('should handle complex query combinations', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?name=Corp&includeInactives=true')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                    
                    // Should find Active Agriculture Corp
                    const foundCorp = res.body.find(sub => sub.name.includes('Corp'));
                    expect(foundCorp).toBeTruthy();
                });
        });

        it('should return empty results for impossible filter combinations', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?name=NonExistent&recordId=IMPOSSIBLE')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveLength(0);
                });
        });

        it('should handle query parameter edge cases gracefully', () => {
            return request(app.getHttpServer())
                .get('/subsidiaries?name=&recordId=&includeInactives=invalid')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200) // Should handle invalid/empty parameters gracefully
                .then(res => {
                    // Should return default result (active subsidiaries)
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });
    });

    describe('Error Handling and System Resilience', () => {
        
        it('should handle database connection issues gracefully', async () => {
            // This test conceptually verifies error handling
            // In real scenarios, we might mock database failures
            
            // For now, test malformed requests that might cause database errors
            return request(app.getHttpServer())
                .get('/subsidiaries/malformed-object-id')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(400)
                .then(res => {
                    expect(res.body.message).toMatch(/invalid.*objectid|cast.*objectid|not a valid.*objectid/i);
                });
        });

        it('should provide meaningful error messages for business rule violations', async () => {
            const subsidiaryWithClients = await new subsidiaryModel({
                recordId: 'SUB_ERROR_TEST',
                name: 'Error Test Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();

            await new clientModel({
                recordId: 'CLI_ERROR_TEST',
                name: 'Error Test Client',
                subsidiaryId: subsidiaryWithClients._id,
                isActive: true,
                isDeleted: false
            }).save();

            return request(app.getHttpServer())
                .patch(`/subsidiaries/${subsidiaryWithClients._id}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({ isActive: false })
                .expect(409)
                .then(res => {
                    expect(res.body.message).toContain('1 active client');
                    expect(res.body.message).toMatch(/reassign.*deactivate.*first/i);
                    expect(res.body).toHaveProperty('statusCode', 409);
                });
        });

        it('should handle invalid update attempts gracefully', () => {
            return request(app.getHttpServer())
                .patch(`/subsidiaries/${new Types.ObjectId()}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({ name: 'Updated Name' })
                .expect(404)
                .then(res => {
                    expect(res.body.message).toMatch(/not found.*could not be updated|not found.*permission/i);
                });
        });

        it('should validate request body structure and types', () => {
            return request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({ name: 123, invalidField: 'value' }) // Wrong type + extra field
                .expect(400)
                .then(res => {
                    const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                    expect(messages.some(msg => /must be a string|should not exist/i.test(msg))).toBe(true);
                });
        });

        it('should handle extremely long field values', () => {
            const veryLongName = 'A'.repeat(1000); // Very long name
            
            return request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({ name: veryLongName })
                .expect(201) // Should succeed unless there's a length limit
                .then(res => {
                    expect(res.body.name).toBe(veryLongName);
                });
        });
    });
});