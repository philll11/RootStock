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
import { UpdateCounterDto } from '../../src/counters/dto/update-counter.dto';

describe('Counters Advanced (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Test Data
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));

        // Seed counter with all resources
        await new counterModel({ _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 }).save();
        await new counterModel({ _id: 'client', prefix: 'CLI', sequence_value: 0 }).save();
        await new counterModel({ _id: 'user', prefix: 'USR', sequence_value: 0 }).save();
        await new counterModel({ _id: 'role', prefix: 'ROL', sequence_value: 0 }).save();
        await new counterModel({ _id: 'orchard', prefix: 'ORC', sequence_value: 0 }).save();

        // Create an admin user with permissions to edit counters AND create subsidiaries
        const adminRole = await new roleModel({
            recordId: 'ROLE_C_ADV_ADMIN', name: 'Counter Advanced Admin',
            permissions: [
                PERMISSIONS.COUNTERS_VIEW, 
                PERMISSIONS.COUNTERS_EDIT, 
                PERMISSIONS.SUBSIDIARY_CREATE,
                PERMISSIONS.SUBSIDIARY_VIEW,
                PERMISSIONS.SUBSIDIARY_EDIT
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }).save();
        const adminUser = await new userModel({
            recordId: 'USER_C_ADV_ADMIN', name: 'Counter Advanced Admin', firstName: 'Counter', lastName: 'Admin',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }).save();
        adminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    it('should change the recordId prefix of a newly created resource after the counter is updated', async () => {
        // Create a subsidiary and verify its original prefix
        const createSubDto1 = { name: 'First Company' };
        const res1 = await request(app.getHttpServer())
            .post('/subsidiaries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createSubDto1)
            .expect(201);

        expect(res1.body.recordId).toMatch(/^SUB\d{4,}$/);

        // Update the prefix for the 'subsidiary' counter via the API
        const updateCounterDto: UpdateCounterDto = { prefix: 'FIRM' };
        await request(app.getHttpServer())
            .patch('/counters/subsidiary')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateCounterDto)
            .expect(200);

        // Create a SECOND subsidiary
        const createSubDto2 = { name: 'Second Company' };
        const res2 = await request(app.getHttpServer())
            .post('/subsidiaries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createSubDto2)
            .expect(201);

        // Assert that the NEW subsidiary uses the NEW prefix
        expect(res2.body.recordId).toMatch(/^FIRM\d{4,}$/);
    });

    describe('Counter Concurrency & Atomicity', () => {
        it('should handle multiple resource creations with same counter type', async () => {
            // Create multiple subsidiaries rapidly to test counter atomicity
            const createPromises = Array.from({ length: 5 }, (_, i) => 
                request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ name: `Concurrent Company ${i + 1}` })
                    .expect(201)
            );

            const responses = await Promise.all(createPromises);
            const recordIds = responses.map(res => res.body.recordId);

            // All recordIds should be unique and sequential
            const sequenceNumbers = recordIds.map(id => 
                parseInt(id.replace(/^[A-Z]+/, ''))
            );
            
            sequenceNumbers.sort((a, b) => a - b);
            expect(new Set(sequenceNumbers).size).toBe(5); // All unique
            
            // Should be sequential (allowing for other tests that may have created subsidiaries)
            for (let i = 1; i < sequenceNumbers.length; i++) {
                expect(sequenceNumbers[i]).toBeGreaterThan(sequenceNumbers[i - 1]);
            }
        });

        it('should maintain counter integrity across different resource types', async () => {
            // Get initial counter states
            const initialCounters = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const initialSubCount = initialCounters.body.find(c => c._id === 'subsidiary')?.sequence_value || 0;

            // Update subsidiary counter prefix
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'COMPANY' })
                .expect(200);

            // Create new subsidiary - should use new prefix but maintain sequence integrity
            const newSubResponse = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Post-Update Company' })
                .expect(201);

            expect(newSubResponse.body.recordId).toMatch(/^COMPANY\d{4,}$/);

            // Verify counter was incremented properly
            const finalCounters = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const finalSubCount = finalCounters.body.find(c => c._id === 'subsidiary')?.sequence_value || 0;
            expect(finalSubCount).toBeGreaterThan(initialSubCount);
        });
    });

    describe('Business Rule Enforcement', () => {
        it('should preserve existing recordIds when counter prefix is updated', async () => {
            // Create a subsidiary with current prefix
            const initialResponse = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Before Prefix Change' })
                .expect(201);

            const originalRecordId = initialResponse.body.recordId;
            const subsidiaryId = initialResponse.body._id;

            // Update counter prefix
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'UPDATED' })
                .expect(200);

            // Verify existing subsidiary recordId is unchanged
            const subsidiaryResponse = await request(app.getHttpServer())
                .get(`/subsidiaries/${subsidiaryId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(subsidiaryResponse.body.recordId).toBe(originalRecordId);
        });

        it('should handle counter prefix rollback scenarios', async () => {
            // Set initial prefix
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'TEMP' })
                .expect(200);

            // Create resource with temporary prefix
            const tempResponse = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Temporary Company' })
                .expect(201);

            expect(tempResponse.body.recordId).toMatch(/^TEMP\d{4,}$/);

            // Rollback prefix
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'SUB' })
                .expect(200);

            // New resource should use rolled-back prefix
            const rolledBackResponse = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Rolled Back Company' })
                .expect(201);

            expect(rolledBackResponse.body.recordId).toMatch(/^SUB\d{4,}$/);
        });
    });

    describe('Error Recovery & Resilience', () => {
        it('should handle counter update failures gracefully', async () => {
            // Try to update non-existent counter
            await request(app.getHttpServer())
                .patch('/counters/nonexistent')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: 'FAIL' })
                .expect(404);

            // Verify existing counters are unaffected
            const countersResponse = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(countersResponse.body.length).toBeGreaterThanOrEqual(5); // All 5 counters should exist
            
            // Should still be able to create resources normally
            const resourceResponse = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Recovery Test Company' })
                .expect(201);

            expect(resourceResponse.body.recordId).toBeDefined();
        });

        it('should maintain data consistency during partial failures', async () => {
            // Get initial state
            const initialCounters = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const initialCount = initialCounters.body.length;

            // Try invalid update (should fail)
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ prefix: '' }) // Invalid empty prefix
                .expect(400);

            // Verify counter list is unchanged
            const finalCounters = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(finalCounters.body.length).toBe(initialCount);
        });
    });
});