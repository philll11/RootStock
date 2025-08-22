import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Subsidiaries CRUD - Comprehensive Business Operations (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test users for comprehensive business scenario testing
    let globalAdminToken: string; // Full subsidiary management capabilities
    let subsidiaryManagerToken: string; // Limited subsidiary management
    let readOnlyUserToken: string; // View-only access

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create comprehensive role hierarchy for realistic testing
        const globalAdminRole = await new roleModel({
            recordId: 'ADMIN_SUB_CRUD',
            name: 'Global Administrator',
            permissions: [
                PERMISSIONS.SUBSIDIARY_CREATE,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.SUBSIDIARY_EDIT,
                PERMISSIONS.SUBSIDIARY_EDIT_STATUS,
                PERMISSIONS.SUBSIDIARY_DELETE,
                PERMISSIONS.VIEW_DELETED
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryManagerRole = await new roleModel({
            recordId: 'MANAGER_SUB_CRUD',
            name: 'Subsidiary Manager',
            permissions: [
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.SUBSIDIARY_EDIT,
                // NOTE: No CREATE, DELETE, or STATUS editing permissions
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const readOnlyRole = await new roleModel({
            recordId: 'READONLY_SUB_CRUD',
            name: 'Read-Only User',
            permissions: [PERMISSIONS.SUBSIDIARY_VIEW],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        // Create test users with different permission levels
        const adminUser = await new userModel({
            recordId: 'ADMIN_SUB_CRUD_USER',
            name: 'Admin User',
            firstName: 'Global',
            lastName: 'Administrator',
            email: 'admin@subsidiary-test.com',
            userType: UserType.EMPLOYEE,
            roleId: globalAdminRole._id
        }).save();
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId });

        const managerUser = await new userModel({
            recordId: 'MANAGER_SUB_CRUD_USER',
            name: 'Manager User',
            firstName: 'Subsidiary',
            lastName: 'Manager',
            email: 'manager@subsidiary-test.com',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryManagerRole._id
        }).save();
        subsidiaryManagerToken = jwtService.sign({ sub: managerUser.recordId });

        const readOnlyUser = await new userModel({
            recordId: 'READONLY_SUB_CRUD_USER',
            name: 'ReadOnly User',
            firstName: 'Read',
            lastName: 'Only',
            email: 'readonly@subsidiary-test.com',
            userType: UserType.EMPLOYEE,
            roleId: readOnlyRole._id
        }).save();
        readOnlyUserToken = jwtService.sign({ sub: readOnlyUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });
    
    beforeEach(async () => { 
        await subsidiaryModel.deleteMany({}); 
    });

    describe('POST /subsidiaries - Subsidiary Creation', () => {
        
        describe('Successful Creation Scenarios', () => {
            it('should create subsidiary with sequential recordId and proper defaults', () => {
                const createDto = { name: 'Pacific Agriculture Solutions' };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(createDto)
                    .expect(201)
                    .then(res => {
                        // Verify system-generated fields
                        expect(res.body).toHaveProperty('recordId');
                        expect(res.body.recordId).toMatch(/^SUB\d{4,}$/);
                        expect(res.body).toHaveProperty('_id');
                        
                        // Verify business fields
                        expect(res.body.name).toBe('Pacific Agriculture Solutions');
                        
                        // Verify default states
                        expect(res.body.isActive).toBe(true);
                        expect(res.body.isDeleted).toBe(false);
                        
                        // Verify timestamps
                        expect(res.body).toHaveProperty('createdAt');
                        expect(res.body).toHaveProperty('updatedAt');
                    });
            });

            it('should create multiple subsidiaries with sequential recordIds', async () => {
                const subsidiaries = [
                    { name: 'Northern Agriculture Corp' },
                    { name: 'Southern Farming Solutions' },
                    { name: 'Eastern Orchard Management' }
                ];

                const responses: any[] = [];
                for (const dto of subsidiaries) {
                    const response = await request(app.getHttpServer())
                        .post('/subsidiaries')
                        .set('Authorization', `Bearer ${globalAdminToken}`)
                        .send(dto)
                        .expect(201);
                    responses.push(response);
                }

                // Verify sequential recordId generation
                const recordIds = responses.map(r => r.body.recordId);
                expect(recordIds).toHaveLength(3);
                
                // Verify all recordIds follow pattern and are unique
                recordIds.forEach(id => {
                    expect(id).toMatch(/^SUB\d{4,}$/);
                });
                expect(new Set(recordIds).size).toBe(3); // All unique
            });
        });

        describe('Validation Failure Scenarios', () => {
            it('should reject creation with missing required name field', () => {
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({}) // No name provided
                    .expect(400)
                    .then(res => {
                        const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                        expect(messages.some(msg => msg.includes('name'))).toBe(true);
                        expect(messages.some(msg => /should not be empty|is required/i.test(msg))).toBe(true);
                    });
            });

            it('should reject creation with empty string name', () => {
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: '' })
                    .expect(400)
                    .then(res => {
                        const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                        expect(messages.some(msg => msg.includes('name'))).toBe(true);
                    });
            });

            it('should reject creation with non-string name', () => {
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 12345 })
                    .expect(400)
                    .then(res => {
                        const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                        expect(messages.some(msg => msg.includes('name'))).toBe(true);
                        expect(messages.some(msg => /must be a string/i.test(msg))).toBe(true);
                    });
            });

            it('should reject creation with extra non-whitelisted fields', () => {
                const invalidDto = { 
                    name: 'Valid Subsidiary', 
                    unexpectedField: 'should be rejected',
                    anotherId: 'also invalid'
                };
                
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400)
                    .then(res => {
                        const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                        expect(messages.some(msg => /property.*should not exist|unknown field/i.test(msg))).toBe(true);
                    });
            });

            it('should reject creation without proper authentication', () => {
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .send({ name: 'Unauthenticated Subsidiary' })
                    .expect(401);
            });

            it('should reject creation without proper permissions', () => {
                return request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${readOnlyUserToken}`)
                    .send({ name: 'Unauthorized Subsidiary' })
                    .expect(403);
            });
        });
    });

    describe('GET /subsidiaries - Subsidiary Query and Listing', () => {
        
        let testSubsidiaries: SubsidiaryDocument[];

        beforeEach(async () => {
            // Create diverse test data for query testing
            testSubsidiaries = await Promise.all([
                new subsidiaryModel({
                    recordId: 'SUB001',
                    name: 'Active Agriculture Corp',
                    isActive: true,
                    isDeleted: false
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB002', 
                    name: 'Inactive Farming Solutions',
                    isActive: false,
                    isDeleted: false
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB003',
                    name: 'Deleted Orchard Management',
                    isActive: false,
                    isDeleted: true
                }).save(),
                new subsidiaryModel({
                    recordId: 'SUB004',
                    name: 'Pacific AgriTech Solutions',
                    isActive: true,
                    isDeleted: false
                }).save()
            ]);
        });

        describe('Default Query Behavior', () => {
            it('should return only active, non-deleted subsidiaries by default', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(2); // Only active, non-deleted
                        res.body.forEach(sub => {
                            expect(sub.isActive).toBe(true);
                            expect(sub.isDeleted).toBe(false);
                        });
                    });
            });

            it('should include proper subsidiary fields in response', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.length).toBeGreaterThan(0);
                        const subsidiary = res.body[0];
                        
                        // Required fields
                        expect(subsidiary).toHaveProperty('_id');
                        expect(subsidiary).toHaveProperty('recordId');
                        expect(subsidiary).toHaveProperty('name');
                        expect(subsidiary).toHaveProperty('isActive');
                        expect(subsidiary).toHaveProperty('isDeleted');
                        expect(subsidiary).toHaveProperty('createdAt');
                        expect(subsidiary).toHaveProperty('updatedAt');
                    });
            });
        });

        describe('Query Filtering', () => {
            it('should filter subsidiaries by name using regex search', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?name=Pacific')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].name).toBe('Pacific AgriTech Solutions');
                    });
            });

            it('should filter subsidiaries by recordId using regex search', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?recordId=SUB001')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].recordId).toBe('SUB001');
                    });
            });

            it('should include inactive subsidiaries when includeInactives=true', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?includeInactives=true')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(3); // Active + Inactive, but not deleted
                        const inactiveFound = res.body.find(sub => !sub.isActive);
                        expect(inactiveFound).toBeTruthy();
                    });
            });

            it('should show deleted subsidiaries when isDeleted=true (with proper permissions)', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?isDeleted=true')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].isDeleted).toBe(true);
                        expect(res.body[0].name).toBe('Deleted Orchard Management');
                    });
            });

            it('should reject deleted query for users without VIEW_DELETED permission', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?isDeleted=true')
                    .set('Authorization', `Bearer ${readOnlyUserToken}`)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toMatch(/permission.*deleted/i);
                    });
            });

            it('should handle case-insensitive name searches', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?name=agriculture')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(1);
                        expect(res.body[0].name).toBe('Active Agriculture Corp');
                    });
            });

            it('should handle partial recordId searches', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries?recordId=SUB00')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body).toHaveLength(2); // SUB001, SUB002, but SUB002 is inactive
                    });
            });
        });

        describe('Query Authorization', () => {
            it('should require authentication for subsidiary listing', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries')
                    .expect(401);
            });

            it.todo('should require SUBSIDIARY_VIEW permission');
        });
    });

    describe('GET /subsidiaries/:subsidiaryId - Individual Subsidiary Access', () => {
        
        let testSubsidiary: SubsidiaryDocument;

        beforeEach(async () => {
            testSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_INDIVIDUAL',
                name: 'Individual Test Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();
        });

        describe('Successful Access Scenarios', () => {
            it('should return specific subsidiary by valid ObjectId', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body._id).toBe(testSubsidiary._id.toString());
                        expect(res.body.recordId).toBe('SUB_INDIVIDUAL');
                        expect(res.body.name).toBe('Individual Test Subsidiary');
                        
                        // Verify complete subsidiary object
                        expect(res.body).toHaveProperty('isActive');
                        expect(res.body).toHaveProperty('isDeleted');
                        expect(res.body).toHaveProperty('createdAt');
                        expect(res.body).toHaveProperty('updatedAt');
                    });
            });
        });

        describe('Access Failure Scenarios', () => {
            it('should return 404 for non-existent subsidiary ID', () => {
                const fakeId = new Types.ObjectId();
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${fakeId}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(404)
                    .then(res => {
                        expect(res.body.message).toMatch(/not found.*permission/i);
                    });
            });

            it('should return 400 for malformed ObjectId', () => {
                return request(app.getHttpServer())
                    .get('/subsidiaries/invalid-object-id')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(400)
                    .then(res => {
                        expect(res.body.message).toMatch(/invalid.*objectid|cast.*objectid/i);
                    });
            });

            it('should require authentication for subsidiary access', () => {
                return request(app.getHttpServer())
                    .get(`/subsidiaries/${testSubsidiary._id}`)
                    .expect(401);
            });

            it('should return 404 for deleted subsidiary (unless user has VIEW_DELETED)', async () => {
                // Mark subsidiary as deleted
                await subsidiaryModel.findByIdAndUpdate(testSubsidiary._id, { 
                    isDeleted: true, 
                    isActive: false 
                });

                await request(app.getHttpServer())
                    .get(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${readOnlyUserToken}`)
                    .expect(404);
            });
        });
    });

    describe('PATCH /subsidiaries/:subsidiaryId - Subsidiary Updates', () => {
        
        let testSubsidiary: SubsidiaryDocument;

        beforeEach(async () => {
            testSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_UPDATE',
                name: 'Original Subsidiary Name',
                isActive: true,
                isDeleted: false
            }).save();
        });

        describe('Successful Update Scenarios', () => {
            it('should update subsidiary name successfully', () => {
                const updateDto: UpdateSubsidiaryDto = { name: 'Updated Subsidiary Name' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Updated Subsidiary Name');
                        expect(res.body.recordId).toBe('SUB_UPDATE'); // Should remain unchanged
                        expect(res.body._id).toBe(testSubsidiary._id.toString());
                        
                        // Other fields should remain unchanged
                        expect(res.body.isActive).toBe(true);
                        expect(res.body.isDeleted).toBe(false);
                    });
            });

            it('should update subsidiary status when user has proper permissions', () => {
                const updateDto: UpdateSubsidiaryDto = { isActive: false };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(200)
                    .then(res => {
                        expect(res.body.isActive).toBe(false);
                        expect(res.body.name).toBe('Original Subsidiary Name'); // Should remain unchanged
                    });
            });

            it('should allow partial updates with multiple fields', () => {
                const updateDto: UpdateSubsidiaryDto = { 
                    name: 'Partially Updated Subsidiary',
                    isActive: false
                };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(200)
                    .then(res => {
                        expect(res.body.name).toBe('Partially Updated Subsidiary');
                        expect(res.body.isActive).toBe(false);
                    });
            });
        });

        describe('Update Failure Scenarios', () => {
            it('should reject update with invalid field types', () => {
                const invalidDto = { name: 12345 }; // Wrong type
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400)
                    .then(res => {
                        const messages = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
                        expect(messages.some(msg => /must be a string/i.test(msg))).toBe(true);
                    });
            });

            it('should reject update with non-whitelisted fields', () => {
                const invalidDto = { 
                    name: 'Valid Name',
                    invalidField: 'should be rejected'
                };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(invalidDto)
                    .expect(400);
            });

            it('should reject status update without proper permissions', () => {
                const updateDto: UpdateSubsidiaryDto = { isActive: false };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${subsidiaryManagerToken}`) // No STATUS editing permission
                    .send(updateDto)
                    .expect(403)
                    .then(res => {
                        expect(res.body.message).toMatch(/permission.*isActive.*status/i);
                    });
            });

            it('should reject update without proper EDIT permissions', () => {
                const updateDto: UpdateSubsidiaryDto = { name: 'Unauthorized Update' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${readOnlyUserToken}`) // Only VIEW permission
                    .send(updateDto)
                    .expect(403);
            });

            it('should return 404 for non-existent subsidiary update', () => {
                const fakeId = new Types.ObjectId();
                const updateDto: UpdateSubsidiaryDto = { name: 'Non-existent Update' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${fakeId}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(404);
            });

            it('should return 400 for malformed ObjectId in update', () => {
                const updateDto: UpdateSubsidiaryDto = { name: 'Malformed ID Update' };
                
                return request(app.getHttpServer())
                    .patch('/subsidiaries/invalid-id')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(400);
            });

            it('should require authentication for subsidiary updates', () => {
                const updateDto: UpdateSubsidiaryDto = { name: 'Unauthenticated Update' };
                
                return request(app.getHttpServer())
                    .patch(`/subsidiaries/${testSubsidiary._id}`)
                    .send(updateDto)
                    .expect(401);
            });
        });
    });

    describe('DELETE /subsidiaries/:subsidiaryId - Subsidiary Soft Deletion', () => {
        
        let testSubsidiary: SubsidiaryDocument;

        beforeEach(async () => {
            testSubsidiary = await new subsidiaryModel({
                recordId: 'SUB_DELETE',
                name: 'To Be Deleted Subsidiary',
                isActive: true,
                isDeleted: false
            }).save();
        });

        describe('Successful Deletion Scenarios', () => {
            it('should soft-delete subsidiary successfully', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200)
                    .then(res => {
                        expect(res.body.isDeleted).toBe(true);
                        expect(res.body.isActive).toBe(false);
                        expect(res.body._id).toBe(testSubsidiary._id.toString());
                    });
            });

            it('should make soft-deleted subsidiary inaccessible via normal queries', async () => {
                // Delete the subsidiary
                await request(app.getHttpServer())
                    .delete(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);

                // Verify it's no longer accessible via GET
                await request(app.getHttpServer())
                    .get(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(404);
            });

            it('should make soft-deleted subsidiary inaccessible via listing', async () => {
                // Delete the subsidiary
                await request(app.getHttpServer())
                    .delete(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);

                // Verify it's not in the listing
                const res = await request(app.getHttpServer())
                    .get('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(200);
                
                const foundSubsidiary = res.body.find(sub => sub._id === testSubsidiary._id.toString());
                expect(foundSubsidiary).toBeUndefined();
            });
        });

        describe('Deletion Failure Scenarios', () => {
            it('should reject deletion without proper permissions', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${testSubsidiary._id}`)
                    .set('Authorization', `Bearer ${readOnlyUserToken}`) // No DELETE permission
                    .expect(403);
            });

            it('should return 404 for non-existent subsidiary deletion', () => {
                const fakeId = new Types.ObjectId();
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${fakeId}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(404);
            });

            it('should return 400 for malformed ObjectId in deletion', () => {
                return request(app.getHttpServer())
                    .delete('/subsidiaries/invalid-id')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .expect(400);
            });

            it('should require authentication for subsidiary deletion', () => {
                return request(app.getHttpServer())
                    .delete(`/subsidiaries/${testSubsidiary._id}`)
                    .expect(401);
            });
        });
    });
});