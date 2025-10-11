import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';

describe('Roles Advanced (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Personas
    let globalAdminToken: string;

    // Test Entities
    let clientRoleInUse: RoleDocument;
    let globalRole: RoleDocument;
    let roleToDelete: RoleDocument;
    let userToClean: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get models
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        // Create roles, users, and subsidiaries in parallel for efficiency
        const [adminRole, clientRole, deletableRole] = await Promise.all([
            roleModel.create({ recordId: 'PLATFORM_ADMIN_ADVANCED', firstName: 'Platform', lastName: 'Admin', name: 'Platform Admin Advanced', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL }),
            roleModel.create({ recordId: 'CLIENT_ROLE_IN_USE', firstName: 'Client', lastName: 'User', name: 'Client Role In Use', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT }),
            roleModel.create({ recordId: 'ROLE_TO_BE_DELETED', firstName: 'Role', lastName: 'To Be Deleted', name: 'Role To Be Deleted', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.CLIENT }),
        ]);

        clientRoleInUse = clientRole;
        globalRole = adminRole;
        roleToDelete = deletableRole;

        const [testSubsidiary, adminUser] = await Promise.all([
            subsidiaryModel.create({ recordId: 'TEST_SUBSIDIARY_ADVANCED', name: 'Test Subsidiary Advanced' }),
            userModel.create({ recordId: 'GLOBAL_ADMIN_ADVANCED', name: 'Global Admin Advanced', firstName: 'Global', lastName: 'Admin', email: 'global.admin.advanced@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id }),
        ]);

        // Create a user that puts the clientRoleInUse
        await userModel.create({
            name: 'Client User Advanced',
            firstName: 'Client',
            lastName: 'User',
            email: 'client.user.advanced@test.com',
            userType: UserType.CONTACT,
            roleId: clientRoleInUse._id,
            subsidiaryId: testSubsidiary._id,
        });

        // Create a user whose role will be deleted to test cleanup
        userToClean = await userModel.create({
            name: 'User To Clean',
            firstName: 'User',
            lastName: 'ToClean',
            email: 'user.to.clean@test.com',
            userType: UserType.CONTACT,
            roleId: roleToDelete._id,
            subsidiaryId: testSubsidiary._id,
        });

        globalAdminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('DELETE /roles/:id', () => {
        it('should return 409 when trying to delete a role that is in use', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/roles/${clientRoleInUse._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(409);

            expect(response.body.message).toContain('Cannot delete role as it is currently assigned to one or more users.');
        });

        it('should soft-delete a role and nullify the roleId on associated users', async () => {
            // Ensure user has the roleId before deletion
            expect(userToClean.roleId.toString()).toBe(roleToDelete._id.toString());

            await request(app.getHttpServer())
                .delete(`/roles/${roleToDelete._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify user's roleId was nullified
            const updatedUser = await userModel.findById(userToClean._id);
            expect(updatedUser).not.toBeNull();
            expect(updatedUser!.roleId).toBeNull();

            // Verify role is soft-deleted
            const deletedRole = await roleModel.findById(roleToDelete._id);
            expect(deletedRole).not.toBeNull();
            expect(deletedRole!.isDeleted).toBe(true);
        });
    });

    describe('PATCH /roles/:id', () => {
        it('should return 409 when trying to deactivate a role that is in use', async () => {
            const updateDto = {
                isActive: false,
                __v: clientRoleInUse.__v,
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${clientRoleInUse._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(409);

            expect(response.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it.');
        });

        it('should prevent updating the visibilityScope of a role', async () => {
            const updateDto = {
                visibilityScope: VisibilityScope.GLOBAL, // Attempting to change from CLIENT
                __v: clientRoleInUse.__v,
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${clientRoleInUse._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(400);

            expect(response.body.message).toContain('visibilityScope is immutable and cannot be updated.');

            // Verify the scope was not changed in the database
            const roleInDb = await roleModel.findById(clientRoleInUse._id);
            expect(roleInDb?.visibilityScope).toBe(VisibilityScope.CLIENT);
        });

        it('should prevent updating a GLOBAL role to have a subsidiaryId', async () => {
            const randomSubsidiaryId = 'SUB12345';
            const updateDto = {
                subsidiaryId: randomSubsidiaryId,
                __v: globalRole.__v,
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${globalRole._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(400);

            expect(response.body.message).toContain('Global roles cannot be assigned to a subsidiary.');
        });
    });
});