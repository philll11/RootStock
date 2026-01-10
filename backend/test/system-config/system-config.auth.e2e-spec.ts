import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { UpdateSystemConfigDto } from '../../src/system/config/dto/update-system-config.dto';

describe('System Config Auth (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let systemConfigModel: Model<SystemConfigDocument>;

    // Auth Tokens
    let globalAdminToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));

        // Create a single config for testing
        await systemConfigModel.create([
            { key: 'audit', value: { enabled: true }, description: 'Audit' }
        ]);

        // Create roles and users
        const [adminRole, viewOnlyRole, noPermsRole] = await roleModel.create([
            { recordId: 'ROLE_SC_AUTH_ADMIN', name: 'Config Auth Admin', permissions: [PERMISSIONS.SYSTEM_CONFIG_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_SC_AUTH_VIEW', name: 'Config View Only', permissions: [PERMISSIONS.SYSTEM_CONFIG_VIEW], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_SC_AUTH_NONE', name: 'No Config Perms', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.GLOBAL },
        ]);

        const [adminUser, viewOnlyUser, noPermsUser] = await userModel.create([
            { recordId: 'USER_SC_AUTH_ADMIN', name: 'Config Auth Admin', firstName: 'Config', lastName: 'Admin', email: 'config.admin@example.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'USER_SC_AUTH_VIEW', name: 'Config View Only', firstName: 'Config', lastName: 'View Only', email: 'config.viewonly@example.com', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id },
            { recordId: 'USER_SC_AUTH_NONE', name: 'No Config Perms', firstName: 'No', lastName: 'Config Perms', email: 'config.noperms@example.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id },
        ]);

        // Generate tokens
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId, tokenVersion: 0 });
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /system/config', () => {
        it('should fail with 401 for unauthenticated requests', async () => {
            await request(app.getHttpServer()).get('/system/config').expect(401);
        });

        it('should fail with 403 for a user without the SYSTEM_CONFIG_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/system/config').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });

        it('should succeed for a user with the SYSTEM_CONFIG_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/system/config').set('Authorization', `Bearer ${viewOnlyToken}`).expect(200);
        });

        it('should succeed for a user with the SYSTEM_CONFIG_EDIT permission (assuming they also have VIEW or it implies VIEW)', async () => {
            // Note: In our RBAC, EDIT usually implies VIEW or is assigned together. 
            // The admin role has both.
            await request(app.getHttpServer()).get('/system/config').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
        });
    });

    describe('PATCH /system/config/:key', () => {
        const updateDto: UpdateSystemConfigDto = { value: { updated: true } };

        it('should fail with 401 for unauthenticated requests', async () => {
            await request(app.getHttpServer()).patch('/system/config/audit').send(updateDto).expect(401);
        });

        it('should fail with 403 for a user without the SYSTEM_CONFIG_EDIT permission', async () => {
            await request(app.getHttpServer()).patch('/system/config/audit').set('Authorization', `Bearer ${noPermissionsToken}`).send(updateDto).expect(403);
        });

        it('should fail with 403 for a user with only SYSTEM_CONFIG_VIEW permission', async () => {
            await request(app.getHttpServer()).patch('/system/config/audit').set('Authorization', `Bearer ${viewOnlyToken}`).send(updateDto).expect(403);
        });

        it('should succeed for a user with the SYSTEM_CONFIG_EDIT permission', async () => {
            await request(app.getHttpServer()).patch('/system/config/audit').set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(200);
        });
    });
});
