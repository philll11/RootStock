// backend/test/counter/counter.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Counter, CounterDocument } from '../../src/system/counters/schemas/counter.schema';
import { UpdateCounterDto } from '../../src/system/counters/dto/update-counter.dto';


describe('Counters CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let counterModel: Model<CounterDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Auth
    let globalAdminToken: string;

    // Test Data
    let subsidiaryCounter: CounterDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models
        counterModel = app.get<Model<CounterDocument>>(getModelToken(Counter.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create admin role and user
        const [adminRole] = await roleModel.create([{
            recordId: 'ROLE_COUNTER_ADMIN', name: 'Counter CRUD Admin',
            permissions: [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT],
            visibilityScope: VisibilityScope.GLOBAL
        }]);

        const [adminUser] = await userModel.create([{
            recordId: 'USER_COUNTER_ADMIN', name: 'Counter Admin',
            firstName: 'Counter', lastName: 'Admin',
            email: 'counter.admin@example.com',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }]);
        
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Create test counters using Promise.all for efficiency
        [subsidiaryCounter] = await counterModel.create([
            { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 },
            { _id: 'client', prefix: 'CLI', sequence_value: 0 },
            { _id: 'user', prefix: 'USR', sequence_value: 0 },
            { _id: 'role', prefix: 'ROL', sequence_value: 0 },
            { _id: 'orchard', prefix: 'ORC', sequence_value: 0 },
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /counters', () => {
        it('should return a list of all counters', async () => {
            const res = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(5);
            const foundCounter = res.body.find(c => c._id === subsidiaryCounter._id);
            expect(foundCounter).toBeDefined();
            expect(foundCounter.prefix).toEqual(subsidiaryCounter.prefix);
        });
    });

    describe('PATCH /counters/:id', () => {
        it("should update a counter's prefix", async () => {
            const currentCounter = await counterModel.findById(subsidiaryCounter._id);
            const updateDto: UpdateCounterDto = { 
                prefix: 'COMPANY',
                __v: currentCounter!.__v
            };

            const res = await request(app.getHttpServer())
                .patch(`/counters/${subsidiaryCounter._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body._id).toEqual(subsidiaryCounter._id);
            expect(res.body.prefix).toEqual(updateDto.prefix);
            expect(res.body.__v).toEqual(currentCounter!.__v + 1);
        });

        it('should fail with 409 Conflict when version mismatch occurs', async () => {
            // Get current version
            const currentCounter = await counterModel.findById(subsidiaryCounter._id);

            // Simulate concurrent update
            await counterModel.updateOne({ _id: subsidiaryCounter._id }, { $inc: { __v: 1 } });

            const updateDto: UpdateCounterDto = { 
                prefix: 'CONFLICT',
                __v: currentCounter!.__v // Old version
            };

            await request(app.getHttpServer())
                .patch(`/counters/${subsidiaryCounter._id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(409);
        });

        it('should return 404 for a non-existent counter', async () => {
            const updateDto: UpdateCounterDto = { 
                prefix: 'FAIL',
                __v: 0
            };

            await request(app.getHttpServer())
                .patch('/counters/nonexistent')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(404);
        });

        describe('Validation', () => {
            it('should return 400 for an empty prefix', async () => {
                const updateDto = { 
                    prefix: '',
                    __v: subsidiaryCounter.__v
                };

                await request(app.getHttpServer())
                    .patch(`/counters/${subsidiaryCounter._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(400);
            });

            it('should return 400 for a prefix exceeding max length', async () => {
                const updateDto = { 
                    prefix: 'THISISWAYTOOLONG',
                    __v: subsidiaryCounter.__v
                };

                await request(app.getHttpServer())
                    .patch(`/counters/${subsidiaryCounter._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(400);
            });

            it('should return 400 for a non-whitelisted field', async () => {
                const updateDto = { 
                    prefix: 'VALID', 
                    unexpected: 'field',
                    __v: subsidiaryCounter.__v
                };

                await request(app.getHttpServer())
                    .patch(`/counters/${subsidiaryCounter._id}`)
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(updateDto)
                    .expect(400);
            });
        });
    });
});