// backend/test/assessment/assessment.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../../src/assets/orchards/schemas/orchard.schema';
import { Block, BlockDocument } from '../../src/assets/blocks/schemas/block.schema';
import { Assessment, AssessmentDocument, AssessmentStatus, AssessmentType } from '../../src/operations/assessments/schemas/assessment.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Assessments Advanced Logic - Compliance & Offline (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let assessmentModel: Model<AssessmentDocument>;
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let varietyModel: Model<VarietyDocument>;

    // Tokens
    let adminToken: string;

    // Entities
    let testClient: ClientDocument;
    let testBlock: BlockDocument;
    let variety: VarietyDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        assessmentModel = app.get<Model<AssessmentDocument>>(getModelToken(Assessment.name));
        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // 1. Setup Data
        variety = await varietyModel.create({ name: 'Cosmic Crisp', recordId: 'VAR_ADV' });
        testClient = await clientModel.create({ recordId: 'CLI_ADV', name: 'Adv Client' });
        const orchard = await orchardModel.create({ recordId: 'ORC_ADV', name: 'Adv Orchard', clientId: testClient._id });
        testBlock = await blockModel.create({ 
            recordId: 'BLK_ADV', name: 'Adv Block', orchardId: orchard._id, clientId: testClient._id, plantings: [{ varietyId: variety._id, treeCount: 100 }] 
        });

        // 2. Admin User
        const adminRole = await roleModel.create({ recordId: 'ADM', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL });
        const adminUser = await userModel.create({ recordId: 'ADM', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@adv.com', userType: UserType.EMPLOYEE, roleId: adminRole._id });
        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => await assessmentModel.deleteMany({}));

    describe('Audit & Compliance (The Insurance Rule)', () => {
        let completedAssessment: AssessmentDocument;

        beforeEach(async () => {
            // Create a COMPLETED assessment
            completedAssessment = await assessmentModel.create({
                recordId: 'ASM_LOCKED',
                name: 'Locked Assessment',
                type: AssessmentType.HAIL,
                blockId: testBlock._id,
                clientId: testClient._id,
                varietyId: variety._id,
                date: new Date(),
                status: AssessmentStatus.COMPLETED, // <--- LOCKED
                samples: [{ rowNumber: 1, totalFruit: 100, damagedFruit: 10 }], // 10% Damage
                summary: { totalSamples: 1, totalFruit: 100, totalDamaged: 10, averageDamagePercentage: 10.0 }
            });
        });

        it('should REJECT modification of Completed assessment without changeReason', async () => {
            await request(app.getHttpServer())
                .patch(`/assessments/${completedAssessment._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    samples: [{ rowNumber: 1, totalFruit: 100, damagedFruit: 20 }], // Changing to 20%
                    __v: completedAssessment.__v
                })
                .expect(400); // Bad Request
        });

        it('should ALLOW modification with changeReason and CREATE AUDIT ENTRY', async () => {
            const reason = 'Correction: Counted wrong row';
            
            const res = await request(app.getHttpServer())
                .patch(`/assessments/${completedAssessment._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    samples: [{ rowNumber: 1, totalFruit: 100, damagedFruit: 20 }], // Change to 20%
                    changeReason: reason,
                    __v: completedAssessment.__v
                })
                .expect(200);

            // 1. Verify New Data
            expect(res.body.summary.averageDamagePercentage).toBe(20.0);

            // 2. Verify Audit Log in DB
            const updated = await assessmentModel.findById(completedAssessment._id);
            expect(updated!.revisionHistory).toHaveLength(1);
            
            const entry = updated!.revisionHistory[0];
            expect(entry.reason).toBe(reason);
            expect(entry.action).toBe('UPDATE');
            
            // 3. Verify Historical Snapshot (The "Insurance Rule")
            // The log should contain the OLD data (10%), not the new data (20%)
            expect(entry.previousSummary.averageDamagePercentage).toBe(10.0);
        });
    });

    describe('State Machine & Workflow', () => {
        it('should PREVENT completing an assessment with no samples', async () => {
            const pending = await assessmentModel.create({
                recordId: 'ASM_EMPTY', name: 'Empty Assessment', type: AssessmentType.HAIL, blockId: testBlock._id, clientId: testClient._id, varietyId: variety._id, date: new Date(),
                status: AssessmentStatus.PENDING, samples: []
            });

            await request(app.getHttpServer())
                .patch(`/assessments/${pending._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: AssessmentStatus.COMPLETED, __v: pending.__v })
                .expect(400); // Bad Request
        });

        it('should AUTO-TRANSITION from Pending to In_Progress when samples are added', async () => {
            const pending = await assessmentModel.create({
                recordId: 'ASM_AUTO', name: 'Auto Assessment', type: AssessmentType.HAIL, blockId: testBlock._id, clientId: testClient._id, varietyId: variety._id, date: new Date(),
                status: AssessmentStatus.PENDING, samples: []
            });

            const res = await request(app.getHttpServer())
                .patch(`/assessments/${pending._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    samples: [{ rowNumber: 1, totalFruit: 10, damagedFruit: 0 }],
                    __v: pending.__v 
                })
                .expect(200);

            expect(res.body.status).toBe(AssessmentStatus.IN_PROGRESS);
        });
    });

    describe('Offline Support (Delta Sync)', () => {
        it('should filter records using updatedSince', async () => {
            // 1. Create Old Record
            const oldRecord = await assessmentModel.create({
                recordId: 'ASM_OLD', name: 'Old Assessment', type: AssessmentType.HAIL, blockId: testBlock._id, clientId: testClient._id, varietyId: variety._id, date: new Date(),
                status: AssessmentStatus.PENDING
            });

            await assessmentModel.updateOne({ _id: oldRecord._id }, { $set: { updatedAt: new Date('2023-01-01') } }, { timestamps: false });

            // 2. Create Recent Record
            const recentRecord = await assessmentModel.create({
                recordId: 'ASM_NEW', name: 'New Assessment', type: AssessmentType.HAIL, blockId: testBlock._id, clientId: testClient._id, varietyId: variety._id, date: new Date(),
                status: AssessmentStatus.PENDING
                // updatedAt will be Now()
            });

            // 3. Query with cutoff date (2024-01-01)
            const cutoffDate = new Date('2024-01-01').toISOString();
            
            const res = await request(app.getHttpServer())
                .get(`/assessments?updatedSince=${cutoffDate}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Assert: Should only receive the new record
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('ASM_NEW');
        });
    });
});