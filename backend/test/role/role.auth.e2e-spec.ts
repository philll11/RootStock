import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { CreateRoleDto } from '../../src/roles/dto/create-role.dto';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Roles Authorization - Real Security Model (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let clientModel: Model<any>;
    let subsidiaryModel: Model<any>;

    // Test users representing ACTUAL business roles (from seed.ts)
    let platformAdminToken: string; // ONLY user with role management permissions
    let subsidiaryConsultantToken: string; // No role management permissions
    let clientGrowerToken: string; // No role management permissions  
    let fieldWorkerToken: string; // Minimal permissions, no role access
    
    // Test entities
    let testSubsidiary: any;
    let clientA: any;
    let clientB: any;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        clientModel = app.get<Model<any>>(getModelToken('Client'));
        subsidiaryModel = app.get<Model<any>>(getModelToken('Subsidiary'));

        // Create business hierarchy for authorization testing
        testSubsidiary = await new subsidiaryModel({
            recordId: 'SUB001',
            name: 'AgriTech Solutions'
        }).save();

        clientA = await new clientModel({
            recordId: 'CLI001',
            name: 'Green Valley Orchards',
            subsidiaryId: testSubsidiary._id
        }).save();

        clientB = await new clientModel({
            recordId: 'CLI002',
            name: 'Sunset Fruit Farms',
            subsidiaryId: testSubsidiary._id
        }).save();

        // Create roles matching REAL system design (based on seed.ts)
        const platformAdminRole = await new roleModel({
            recordId: 'PLATFORM_ADMIN',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS), // ALL permissions including role management
            visibilityScope: VisibilityScope.GLOBAL
        }).save();

        const subsidiaryConsultantRole = await new roleModel({
            recordId: 'SUBSIDIARY_CONSULTANT',
            name: 'Agricultural Consultant',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT
                // CRITICAL: NO role management permissions (ROLE_CREATE, ROLE_EDIT, ROLE_DELETE)
            ],
            visibilityScope: VisibilityScope.SUBSIDIARY
        }).save();

        const clientGrowerRole = await new roleModel({
            recordId: 'CLIENT_GROWER',
            name: 'Orchard Grower',
            permissions: [
                PERMISSIONS.CLIENT_VIEW,
                PERMISSIONS.USER_VIEW,
                PERMISSIONS.ORCHARD_VIEW,
                PERMISSIONS.ORCHARD_EDIT
                // CRITICAL: NO role management permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        const fieldWorkerRole = await new roleModel({
            recordId: 'FIELD_WORKER',
            name: 'Field Worker',
            permissions: [
                'Spray:Create',
                'Spray:View',
                'Orchard:View'
                // CRITICAL: NO role, user, or client management permissions
            ],
            visibilityScope: VisibilityScope.CLIENT
        }).save();

        // Create users representing real business stakeholders
        const platformAdmin = await new userModel({
            recordId: 'PLATFORM_ADMIN_USER',
            name: 'Platform Administrator',
            firstName: 'Platform',
            lastName: 'Admin',
            userType: UserType.EMPLOYEE,
            roleId: platformAdminRole._id,
            clientIds: [] // Global access
        }).save();
        platformAdminToken = jwtService.sign({ sub: platformAdmin.recordId });

        const subsidiaryConsultant = await new userModel({
            recordId: 'SUBSIDIARY_CONSULTANT_USER',
            name: 'Agricultural Consultant',
            firstName: 'Expert',
            lastName: 'Consultant',
            userType: UserType.EMPLOYEE,
            roleId: subsidiaryConsultantRole._id,
            clientIds: [clientA._id, clientB._id] // Works with multiple clients
        }).save();
        subsidiaryConsultantToken = jwtService.sign({ sub: subsidiaryConsultant.recordId });

        const clientGrower = await new userModel({
            recordId: 'CLIENT_GROWER_USER',
            name: 'Orchard Grower',
            firstName: 'John',
            lastName: 'Appleton',
            userType: UserType.CONTACT,
            roleId: clientGrowerRole._id,
            clientIds: [clientA._id] // Only their own orchard
        }).save();
        clientGrowerToken = jwtService.sign({ sub: clientGrower.recordId });

        const fieldWorker = await new userModel({
            recordId: 'FIELD_WORKER_USER',
            name: 'Field Worker',
            firstName: 'Tom',
            lastName: 'Picker',
            userType: UserType.CONTACT,
            roleId: fieldWorkerRole._id,
            clientIds: [clientA._id] // Works for specific client
        }).save();
        fieldWorkerToken = jwtService.sign({ sub: fieldWorker.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    beforeEach(async () => {
        // Clean up test-created roles, preserve setup roles
        await roleModel.deleteMany({
            recordId: { $nin: ['PLATFORM_ADMIN', 'SUBSIDIARY_CONSULTANT', 'CLIENT_GROWER', 'FIELD_WORKER'] }
        });
    });

    describe('Real System Behavior - Administrator-Only Role Management (e2e)', () => {
        describe('GET /roles - Visibility Restrictions (RoleQueryBuilder)', () => {
            it('should allow ONLY platform administrator to see role data', async () => {
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.length).toBeGreaterThan(0);
                        // Only platform administrators can see role data
                    });
            });

            it('should return 403 FORBIDDEN for subsidiary consultant (lacks ROLE_VIEW permission)', async () => {
                // REAL SYSTEM: Consultants do NOT have ROLE_VIEW permission in seed.ts
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should return 403 FORBIDDEN for client grower (lacks ROLE_VIEW permission)', async () => {
                // REAL SYSTEM: Growers do NOT have ROLE_VIEW permission in seed.ts
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should return 403 FORBIDDEN for field worker (lacks ROLE_VIEW permission)', async () => {
                // REAL SYSTEM: Field workers have very limited permissions, no ROLE_VIEW
                return request(app.getHttpServer())
                    .get('/roles')
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });
        });

        describe('GET /roles/:id - Individual Role Access (403 for Non-Administrators)', () => {
            it('should return 403 FORBIDDEN for subsidiary consultant accessing role by ID', async () => {
                const roleToAccess = await roleModel.findOne();
                expect(roleToAccess).not.toBeNull();
                
                return request(app.getHttpServer())
                    .get(`/roles/${roleToAccess!._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should return 403 FORBIDDEN for grower accessing role by ID', async () => {
                const roleToAccess = await roleModel.findOne();
                expect(roleToAccess).not.toBeNull();
                
                return request(app.getHttpServer())
                    .get(`/roles/${roleToAccess!._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });

            it('should return 403 FORBIDDEN for field worker accessing role by ID', async () => {
                const roleToAccess = await roleModel.findOne();
                expect(roleToAccess).not.toBeNull();
                
                return request(app.getHttpServer())
                    .get(`/roles/${roleToAccess!._id}`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Blocked by @RequirePermission('Role:View') guard
            });
        });

        describe('NEGATIVE TESTING - Role Creation (Growers Cannot Create Roles)', () => {
            it('should prevent subsidiary consultant from creating roles (no ROLE_CREATE permission)', async () => {
                const newRole = {
                    name: 'Unauthorized Consultant Role',
                    permissions: ['Orchard:View'],
                    visibilityScope: VisibilityScope.CLIENT
                };

                return request(app.getHttpServer())
                    .post('/roles')
                    .send(newRole)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Missing ROLE_CREATE permission
            });

            it('should prevent client grower from creating roles (core business rule violation)', async () => {
                const newRole = {
                    name: 'Grower Role Attempt',
                    permissions: ['Orchard:View'],
                    visibilityScope: VisibilityScope.CLIENT
                };

                return request(app.getHttpServer())
                    .post('/roles')
                    .send(newRole)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Growers cannot create roles - this validates core security requirement
            });

            it('should prevent field worker from creating roles (no ROLE_CREATE permission)', async () => {
                const newRole = {
                    name: 'Worker Role Attempt',
                    permissions: ['Spray:View'],
                    visibilityScope: VisibilityScope.CLIENT
                };

                return request(app.getHttpServer())
                    .post('/roles')
                    .send(newRole)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Field workers cannot create roles
            });
        });

        describe('NEGATIVE TESTING - Role Updates (Only Administrators Can Edit)', () => {
            it('should prevent subsidiary consultant from editing any role', async () => {
                const existingRole = await roleModel.findOne();
                expect(existingRole).not.toBeNull();
                const updateData = {
                    name: 'Unauthorized Update'
                };

                return request(app.getHttpServer())
                    .patch(`/roles/${existingRole!._id}`)
                    .send(updateData)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Missing ROLE_EDIT permission
            });

            it('should prevent grower from editing roles (no ROLE_EDIT permission)', async () => {
                const existingRole = await roleModel.findOne();
                expect(existingRole).not.toBeNull();
                const updateData = {
                    name: 'Grower Update Attempt'
                };

                return request(app.getHttpServer())
                    .patch(`/roles/${existingRole!._id}`)
                    .send(updateData)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Growers cannot edit roles - core security rule
            });

            it('should prevent field worker from editing roles (no ROLE_EDIT permission)', async () => {
                const existingRole = await roleModel.findOne();
                expect(existingRole).not.toBeNull();
                const updateData = {
                    permissions: ['Spray:Create', 'Spray:View']
                };

                return request(app.getHttpServer())
                    .patch(`/roles/${existingRole!._id}`)
                    .send(updateData)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Field workers cannot modify roles
            });
        });

        describe('NEGATIVE TESTING - Role Deletion (Only Administrators Can Delete)', () => {
            it('should prevent consultant from deleting roles (no ROLE_DELETE permission)', async () => {
                const roleToDelete = await new roleModel({
                    recordId: 'DELETE_TEST_CONSULTANT',
                    name: 'Test Role for Consultant Delete',
                    permissions: ['Orchard:View'],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                return request(app.getHttpServer())
                    .delete(`/roles/${roleToDelete._id}`)
                    .set('Authorization', `Bearer ${subsidiaryConsultantToken}`)
                    .expect(403); // Consultants cannot delete roles
            });

            it('should prevent grower from deleting roles (no ROLE_DELETE permission)', async () => {
                const roleToDelete = await new roleModel({
                    recordId: 'DELETE_TEST_GROWER',
                    name: 'Test Role for Grower Delete',
                    permissions: ['User:View'],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                return request(app.getHttpServer())
                    .delete(`/roles/${roleToDelete._id}`)
                    .set('Authorization', `Bearer ${clientGrowerToken}`)
                    .expect(403); // Growers cannot delete roles - validates "Growers shouldn't be able to create roles"
            });

            it('should prevent field worker from deleting roles (no ROLE_DELETE permission)', async () => {
                const roleToDelete = await new roleModel({
                    recordId: 'DELETE_TEST_WORKER',
                    name: 'Test Role for Worker Delete',
                    permissions: ['Spray:View'],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();

                return request(app.getHttpServer())
                    .delete(`/roles/${roleToDelete._id}`)
                    .set('Authorization', `Bearer ${fieldWorkerToken}`)
                    .expect(403); // Field workers cannot delete roles
            });
        });

        describe('Administrator-Only Success Cases (Positive Testing)', () => {
            it('should allow ONLY platform administrator to create roles successfully', async () => {
                const newRole = {
                    name: 'Platform Admin Created Role',
                    permissions: ['Orchard:View', 'User:View'],
                    visibilityScope: VisibilityScope.CLIENT
                };

                return request(app.getHttpServer())
                    .post('/roles')
                    .send(newRole)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(201)
                    .expect((res) => {
                        expect(res.body.name).toBe('Platform Admin Created Role');
                        expect(res.body.recordId).toMatch(/^ROL\d+$/); // Correct prefix from seed.ts
                    });
            });

            it('should allow platform administrator to update roles', async () => {
                const roleToUpdate = await roleModel.findOne();
                expect(roleToUpdate).not.toBeNull();
                const updateData = {
                    name: 'Admin Updated Role Name'
                };
                
                return request(app.getHttpServer())
                    .patch(`/roles/${roleToUpdate!._id}`)
                    .send(updateData)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.name).toBe('Admin Updated Role Name');
                    });
            });

            it('should allow platform administrator to delete roles', async () => {
                const roleToDelete = await new roleModel({
                    recordId: 'ADMIN_DELETE_TEST',
                    name: 'Admin Delete Test Role',
                    permissions: ['Orchard:View'],
                    visibilityScope: VisibilityScope.CLIENT
                }).save();
                
                return request(app.getHttpServer())
                    .delete(`/roles/${roleToDelete._id}`)
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .expect(200);
            });
        });
    });
});