// backend/test/counter/counter.auth.e2e-spec.ts
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
import { Counter, CounterDocument } from '../../src/system/counters/schemas/counter.schema';
import { UpdateCounterDto } from '../../src/system/counters/dto/update-counter.dto';

describe('Counters Auth (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let roleModel: Model<RoleDocument>;
    let userModel: Model<UserDocument>;
    let counterModel: Model<CounterDocument>;

    // Auth Tokens
    let globalAdminToken: string;
    let viewOnlyToken: string;
    let noPermissionsToken: string;

    // Test Data
    let subsidiaryCounter: CounterDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));

        // Create a single counter for testing
        [subsidiaryCounter] = await counterModel.create([
            { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 }
        ]);

        // Create roles and users in parallel for efficiency
        const [adminRole, viewOnlyRole, noPermsRole] = await roleModel.create([
            { recordId: 'ROLE_C_AUTH_ADMIN', name: 'Counter Auth Admin', permissions: [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_C_AUTH_VIEW', name: 'Counter View Only', permissions: [PERMISSIONS.COUNTERS_VIEW], visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'ROLE_C_AUTH_NONE', name: 'No Counter Perms', permissions: [PERMISSIONS.CLIENT_VIEW], visibilityScope: VisibilityScope.GLOBAL },
        ]);

        const [adminUser, viewOnlyUser, noPermsUser] = await userModel.create([
            { recordId: 'USER_C_AUTH_ADMIN', name: 'Counter Auth Admin', firstName: 'Counter', lastName: 'Admin', email: 'counter.admin@example.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'USER_C_AUTH_VIEW', name: 'Counter View Only', firstName: 'Counter', lastName: 'View Only', email: 'counter.viewonly@example.com', userType: UserType.EMPLOYEE, roleId: viewOnlyRole._id },
            { recordId: 'USER_C_AUTH_NONE', name: 'No Counter Perms', firstName: 'No', lastName: 'Counter Perms', email: 'counter.noperms@example.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id },
        ]);

        // Generate tokens for each persona
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        viewOnlyToken = jwtService.sign({ sub: viewOnlyUser.recordId, tokenVersion: 0 });
        noPermissionsToken = jwtService.sign({ sub: noPermsUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /counters', () => {
        it('should fail with 401 for unauthenticated requests', async () => {
            await request(app.getHttpServer()).get('/counters').expect(401);
        });

        it('should fail with 403 for a user without the COUNTERS_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/counters').set('Authorization', `Bearer ${noPermissionsToken}`).expect(403);
        });

        it('should succeed for a user with the COUNTERS_VIEW permission', async () => {
            await request(app.getHttpServer()).get('/counters').set('Authorization', `Bearer ${viewOnlyToken}`).expect(200);
        });

        it('should succeed for a user with the COUNTERS_EDIT permission', async () => {
            await request(app.getHttpServer()).get('/counters').set('Authorization', `Bearer ${globalAdminToken}`).expect(200);
        });
    });

    describe('PATCH /counters/:id', () => {
        const updateDto: UpdateCounterDto = { prefix: 'TEST' };

        it('should fail with 401 for unauthenticated requests', async () => {
            await request(app.getHttpServer()).patch(`/counters/${subsidiaryCounter._id}`).send(updateDto).expect(401);
        });

        it('should fail with 403 for a user without the COUNTERS_EDIT permission', async () => {
            await request(app.getHttpServer()).patch(`/counters/${subsidiaryCounter._id}`).set('Authorization', `Bearer ${noPermissionsToken}`).send(updateDto).expect(403);
        });

        it('should fail with 403 for a user with only the COUNTERS_VIEW permission', async () => {
            await request(app.getHttpServer()).patch(`/counters/${subsidiaryCounter._id}`).set('Authorization', `Bearer ${viewOnlyToken}`).send(updateDto).expect(403);
        });

        it('should succeed for a user with the COUNTERS_EDIT permission', async () => {
            await request(app.getHttpServer()).patch(`/counters/${subsidiaryCounter._id}`).set('Authorization', `Bearer ${globalAdminToken}`).send(updateDto).expect(200);
        });
    });
});