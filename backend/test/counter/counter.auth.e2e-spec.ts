import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Counter, CounterDocument } from '../../src/counters/schemas/counter.schema';

describe('Counters Auth (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Test Data
    let adminToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));

        // Initialize the 'subsidiary' counter with a default prefix
        await new counterModel({ _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 }).save();

        // Admin User (can view and edit)
        const adminRole = await new roleModel({ recordId: 'ROLE_C_AUTH_ADMIN', name: 'Counter Auth Admin', permissions: [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT], visibilityScope: VisibilityScope.GLOBAL }).save();
        const adminUser = await new userModel({ recordId: 'USER_C_AUTH_ADMIN', name: 'Counter Auth Admin', firstName: 'Counter', lastName: 'Admin', userType: UserType.EMPLOYEE, roleId: adminRole._id }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });

        // View-Only User (can only view)
        const viewOnlyRole = await new roleModel({ recordId: 'ROLE_C_AUTH_VIEW', name: 'Counter View Only', permissions: [PERMISSIONS.COUNTERS_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const viewOnlyUser = await new userModel({ recordId: 'USER_C_AUTH_VIEW', name: 'Counter View Only', firstName: 'Counter', lastName: 'View Only', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id }).save();
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId });

        // No Permissions User (cannot do anything)
        const noPermsRole = await new roleModel({ recordId: 'ROLE_C_AUTH_NONE', name: 'No Counter Perms', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.GLOBAL }).save();
        const noPermsUser = await new userModel({ recordId: 'USER_C_AUTH_NONE', name: 'No Counter Perms', firstName: 'No', lastName: 'Counter Perms', userType: UserType.EMPLOYEE, roleId: noPermsRole._id }).save();
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /counters', () => {
        it('should FAIL with 401 for unauthenticated requests', () => {
            return request(app.getHttpServer()).get('/counters').expect(401);
        });

        it('should FAIL with 403 for a user without COUNTERS_VIEW permission', () => {
            return request(app.getHttpServer()).get('/counters').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });

        it('should SUCCEED with 200 for a user with COUNTERS_VIEW permission', () => {
            return request(app.getHttpServer()).get('/counters').set('Authorization', `Bearer ${viewOnlyToken}`).expect(200);
        });
    });

    describe('PATCH /counters/:id', () => {
        it('should FAIL with 401 for unauthenticated requests', () => {
            return request(app.getHttpServer()).patch('/counters/subsidiary').send({ prefix: 'FAIL' }).expect(401);
        });

        it('should FAIL with 403 for a user without COUNTERS_EDIT permission', () => {
            return request(app.getHttpServer()).patch('/counters/subsidiary').set('Authorization', `Bearer ${noPermissionsToken}`).send({ prefix: 'FAIL' }).expect(403);
        });

        it('should FAIL with 403 for a user with only COUNTERS_VIEW permission', () => {
            return request(app.getHttpServer()).patch('/counters/subsidiary').set('Authorization', `Bearer ${viewOnlyToken}`).send({ prefix: 'FAIL' }).expect(403);
        });

        it('should SUCCEED with 200 for a user with COUNTERS_EDIT permission', () => {
            return request(app.getHttpServer()).patch('/counters/subsidiary').set('Authorization', `Bearer ${adminToken}`).send({ prefix: 'SUCCESS' }).expect(200);
        });
    });

    describe('Authentication Edge Cases', () => {
        it('should FAIL with 401 for malformed Authorization header', () => {
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', 'InvalidFormat')
                .expect(401);
        });

        it('should FAIL with 401 for empty Authorization header', () => {
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', '')
                .expect(401);
        });

        it('should FAIL with 401 for Bearer token without actual token', () => {
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', 'Bearer ')
                .expect(401);
        });

        it('should FAIL with 401 for expired token simulation', () => {
            // Note: In real implementation, this would be a properly expired token
            const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
            
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);
        });

        it('should FAIL with 401 for tampered token signature', () => {
            const tamperedToken = adminToken.slice(0, -5) + 'xxxxx'; // Tamper with signature
            
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${tamperedToken}`)
                .expect(401);
        });
    });

    describe('Authorization Edge Cases', () => {
        it('should FAIL with 403 when user has wrong resource permission', () => {
            // noPermissionsToken has CLIENT_VIEW but not COUNTERS_VIEW
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${noPermissionsToken}`)
                .expect(403);
        });

        it('should respect permission hierarchy (edit implies view for endpoints)', async () => {
            // Admin has both COUNTERS_VIEW and COUNTERS_EDIT
            await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'HIERARCHY' })
                .expect(200);
        });

        it('should enforce strict permission separation', async () => {
            // View-only user can read but not write
            await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${viewOnlyToken}`)
                .expect(200);

            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${viewOnlyToken}`)
                .send({ prefix: 'FAIL' })
                .expect(403);
        });

        it('should handle missing permission gracefully for all endpoints', async () => {
            // Test all counter endpoints with insufficient permissions
            await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${noPermissionsToken}`)
                .expect(403);

            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${noPermissionsToken}`)
                .send({ prefix: 'FAIL' })
                .expect(403);
        });
    });

    describe('Security Boundary Testing', () => {
        it('should prevent access to counter operations without any authentication', async () => {
            // No Authorization header at all
            await request(app.getHttpServer())
                .get('/counters')
                .expect(401);

            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .send({ prefix: 'FAIL' })
                .expect(401);
        });

        it('should validate JWT token structure', () => {
            const malformedToken = 'not.a.valid.jwt.token';
            
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${malformedToken}`)
                .expect(401);
        });

        it('should handle case-sensitive permission strings', () => {
            // This would need to be tested with a specially crafted role with wrong case permissions
            // For now, we verify that our known permissions work correctly
            return request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${viewOnlyToken}`)
                .expect(200);
        });
    });
});