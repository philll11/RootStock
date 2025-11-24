// backend/test/counter/counter.advanced.e2e-spec.ts
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
import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { CreateSubsidiaryDto } from '../../src/subsidiaries/dto/create-subsidiary.dto';

describe('Counters Advanced (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let counterModel: Model<CounterDocument>;
    let subsidiaryModel: Model<SubsidiaryDocument>;

    // Auth
    let globalAdminToken: string;

    // Test Data
    let existingSubsidiary: SubsidiaryDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));
        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

        // Create counters
        await counterModel.create([
            { _id: 'subsidiary', prefix: 'SUB', sequence_value: 1 },
            { _id: 'client', prefix: 'CLI', sequence_value: 0 },
        ]);

        // Create admin role and user with all necessary permissions
        const [adminRole] = await roleModel.create([{
            recordId: 'ROLE_C_ADV_ADMIN', name: 'Counter Advanced Admin',
            permissions: [
                PERMISSIONS.COUNTERS_VIEW,
                PERMISSIONS.COUNTERS_EDIT,
                PERMISSIONS.SUBSIDIARY_CREATE,
                PERMISSIONS.SUBSIDIARY_VIEW,
            ],
            visibilityScope: VisibilityScope.GLOBAL
        }]);

        const [adminUser] = await userModel.create([{
            recordId: 'USER_C_ADV_ADMIN', name: 'Counter Advanced Admin',
            firstName: 'Counter', lastName: 'Admin',
            email: 'counter.admin@example.com',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }]);

        globalAdminToken = jwtService.sign({ sub: adminUser.recordId });

        // Create a baseline subsidiary to test against
        [existingSubsidiary] = await subsidiaryModel.create([
            { name: 'Original Company', recordId: 'SUB0001' }
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('Counter and Resource Interaction', () => {
        it('should use the new prefix for a newly created resource after a counter update', async () => {
            // 1. Update the prefix for the 'subsidiary' counter
            const updateCounterDto: UpdateCounterDto = { prefix: 'FIRM' };
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateCounterDto)
                .expect(200);

            // 2. Create a new subsidiary
            const createSubDto: CreateSubsidiaryDto = { name: 'Second Company' };
            const res = await request(app.getHttpServer())
                .post('/subsidiaries')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(createSubDto)
                .expect(201);

            // 3. Assert that the new subsidiary uses the new prefix
            expect(res.body.recordId).toMatch(/^FIRM\d{4}$/);
        });

        it('should preserve the recordId of an existing resource when its counter prefix is updated', async () => {
            const originalRecordId = existingSubsidiary.recordId;

            // 1. Update the counter prefix
            const updateCounterDto: UpdateCounterDto = { prefix: 'CORP' };
            await request(app.getHttpServer())
                .patch('/counters/subsidiary')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateCounterDto)
                .expect(200);

            // 2. Fetch the original subsidiary again
            const res = await request(app.getHttpServer())
                .get(`/subsidiaries/${existingSubsidiary._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // 3. Assert that its recordId has NOT changed
            expect(res.body.recordId).toBe(originalRecordId);
        });

        it('should atomically increment the counter during concurrent resource creation', async () => {
            // 1. Get the counter's sequence value before the test
            const initialCounter = await counterModel.findById('subsidiary');
            const initialSequence = initialCounter?.sequence_value;

            // 2. Fire off 5 concurrent requests to create subsidiaries
            const createPromises = Array.from({ length: 5 }).map(() =>
                request(app.getHttpServer())
                    .post('/subsidiaries')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send({ name: 'Concurrent Co' })
                    .expect(201)
            );
            const responses = await Promise.all(createPromises);

            // 3. Verify all created subsidiaries have unique recordIds
            const recordIds = responses.map(res => res.body.recordId);
            const uniqueRecordIds = new Set(recordIds);
            expect(uniqueRecordIds.size).toBe(5);

            // 4. Verify the counter was incremented by exactly 5
            const finalCounter = await counterModel.findById('subsidiary');
            expect(finalCounter?.sequence_value).toBe(initialSequence ? initialSequence + 5 : 5);
        });
    });
});