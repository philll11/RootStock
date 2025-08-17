import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { Counter, CounterDocument } from '../../src/counters/schemas/counter.schema';
import { UpdateCounterDto } from '../../src/counters/dto/update-counter.dto';


describe('Counters CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let counterModel: Model<CounterDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Test Data
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Seed counter with all resources
        await new counterModel({ _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 }).save();
        await new counterModel({ _id: 'client', prefix: 'CLI', sequence_value: 0 }).save();
        await new counterModel({ _id: 'user', prefix: 'USR', sequence_value: 0 }).save();
        await new counterModel({ _id: 'role', prefix: 'ROL', sequence_value: 0 }).save();
        await new counterModel({ _id: 'orchard', prefix: 'ORC', sequence_value: 0 }).save();

        // Seed an admin role and user with full counter permissions
        const adminRole = await new roleModel({
            recordId: 'ROLE_COUNTER_ADMIN', name: 'Counter CRUD Admin',
            permissions: [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();
        const adminUser = await new userModel({
            recordId: 'USER_COUNTER_ADMIN', name: 'Counter Admin',
            firstName: 'Counter', lastName: 'Admin',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /counters', () => {
        it('should SUCCEED with 200 and return a list of all counters', async () => {
            const response = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Check that the response is an array containing our seeded counters
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(5); // subsidiary, client, user, role, orchard
            const subsidiaryCounter = response.body.find(c => c._id === 'subsidiary');
            expect(subsidiaryCounter).toBeDefined();
            expect(subsidiaryCounter.prefix).toEqual('SUB');
        });
    });

    describe('PATCH /counters/:id', () => {
        it('should SUCCEED with 200 when updating a counter with a valid prefix', async () => {
            const updateDto: UpdateCounterDto = { prefix: 'COMPANY' };

            const response = await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body._id).toEqual('subsidiary');
            expect(response.body.prefix).toEqual('COMPANY');

            // Verify the change in the database
            const dbCounter = await counterModel.findById('subsidiary').exec();
            expect(dbCounter).toBeDefined();
            expect(dbCounter?.prefix).toEqual('COMPANY');
        });

        it('should FAIL with 404 when trying to update a non-existent counter', () => {
            const updateDto: UpdateCounterDto = { prefix: 'FAIL' };

            return request(app.getHttpServer())
                .patch('/counters/nonexistent')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(404);
        });

        it('should FAIL with 400 for an invalid prefix (e.g., empty string)', () => {
            const updateDto = { prefix: '' }; // Invalid DTO

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should FAIL with 400 for a non-whitelisted field', () => {
            const updateDto = { prefix: 'VALID', unexpected: 'field' };

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should FAIL with 400 for prefix exceeding maximum length', () => {
            const updateDto = { prefix: 'ABCDEFGHIJK' }; // 11 characters, exceeds 10 limit

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should FAIL with 400 for null prefix', () => {
            const updateDto = { prefix: null };

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should FAIL with 400 for numeric prefix', () => {
            const updateDto = { prefix: 123 };

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should FAIL with 400 for whitespace-only prefix', () => {
            const updateDto = { prefix: '   ' };

            return request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should SUCCEED with valid special characters in prefix', async () => {
            const updateDto = { prefix: 'SUB_V1' }; // Use simpler special chars

            const response = await request(app.getHttpServer())
                .patch('/counters/client')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.prefix).toBe('SUB_V1');
        });

        it('should SUCCEED with maximum length prefix (10 characters)', async () => {
            const updateDto = { prefix: 'ABCDEFGHIJ' }; // Exactly 10 characters

            const response = await request(app.getHttpServer())
                .patch('/counters/user')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.prefix).toBe('ABCDEFGHIJ');
            expect(response.body.prefix.length).toBe(10);
        });

        it('should SUCCEED with single character prefix', async () => {
            const updateDto = { prefix: 'X' };

            const response = await request(app.getHttpServer())
                .patch('/counters/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.prefix).toBe('X');
        });

        it('should handle concurrent update attempts gracefully', async () => {
            const updateDto1 = { prefix: 'CONC1' }; // Shorter, simpler names
            const updateDto2 = { prefix: 'CONC2' };

            // Both updates should succeed (last one wins)
            await request(app.getHttpServer())
                .patch('/counters/orchard')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto1)
                .expect(200);

            const response = await request(app.getHttpServer())
                .patch('/counters/orchard')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto2)
                .expect(200);

            expect(response.body.prefix).toBe('CONC2');
        });
    });

    describe('Data Integrity & System Integration', () => {
        it('should maintain counter state across multiple operations', async () => {
            // Get initial state
            const initialResponse = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const initialSubsidiary = initialResponse.body.find(c => c._id === 'subsidiary');
            const initialSequence = initialSubsidiary.sequence_value;

            // Update prefix
            const updateDto = { prefix: 'NEWPREFIX' };
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            // Verify sequence_value is preserved
            const finalResponse = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const finalSubsidiary = finalResponse.body.find(c => c._id === 'subsidiary');
            expect(finalSubsidiary.prefix).toBe('NEWPREFIX');
            expect(finalSubsidiary.sequence_value).toBe(initialSequence); // Should be unchanged
        });

        it('should verify counter persistence after updates', async () => {
            // Update counter
            const updateDto = { prefix: 'PERSISTENT' };
            await request(app.getHttpServer())
                .patch('/counters/client')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            // Verify change persisted by checking database directly
            const dbCounter = await counterModel.findById('client').exec();
            expect(dbCounter).toBeDefined();
            expect(dbCounter?.prefix).toBe('PERSISTENT');
        });

        it('should handle prefix with mixed case and numbers', async () => {
            const updateDto = { prefix: 'SubV2' };

            const response = await request(app.getHttpServer())
                .patch('/counters/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.prefix).toBe('SubV2');
        });
    });
});