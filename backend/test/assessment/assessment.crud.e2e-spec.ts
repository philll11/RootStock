// backend/test/assessment/assessment.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../../src/assets/orchards/schemas/orchard.schema';
import { Block, BlockDocument } from '../../src/assets/blocks/schemas/block.schema';
import { Assessment, AssessmentDocument, AssessmentStatus } from '../../src/operations/assessments/schemas/assessment.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CreateAssessmentDto } from '../../src/operations/assessments/dto/create-assessment.dto';

describe('Assessments CRUD & Data Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let assessmentModel: Model<AssessmentDocument>;
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let varietyModel: Model<VarietyDocument>;

    // Tokens
    let consultantToken: string;

    // Entities
    let testClient: ClientDocument;
    let testOrchard: OrchardDocument;
    let testBlock: BlockDocument;
    let varietyGala: VarietyDocument;

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

        // 1. Setup Master Data
        varietyGala = await varietyModel.create({ name: 'Gala', recordId: 'VAR_001' });

        // 2. Setup Hierarchy
        testClient = await clientModel.create({ recordId: 'CLI_ASM', name: 'Assessment Client' });
        testOrchard = await orchardModel.create({ recordId: 'ORC_ASM', name: 'Assessment Orchard', clientId: testClient._id });
        
        testBlock = await blockModel.create({
            recordId: 'BLK_ASM', 
            name: 'Block A', 
            orchardId: testOrchard._id, 
            clientId: testClient._id,
            plantings: [{ varietyId: varietyGala._id, treeCount: 100 }]
        });

        // 3. Setup User (Consultant)
        const consultantRole = await roleModel.create({ 
            recordId: 'CON_ROL', 
            name: 'Consultant', 
            permissions: [PERMISSIONS.ASSESSMENT_CREATE, PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_EDIT, PERMISSIONS.ASSESSMENT_DELETE, PERMISSIONS.BLOCK_VIEW], 
            visibilityScope: VisibilityScope.CLIENT 
        });

        const consultantUser = await userModel.create({
            recordId: 'CON_ASM', 
            name: 'Consultant User', 
            firstName: 'Consultant',
            lastName: 'User',
            email: 'consultant_asm@test.com', 
            userType: UserType.EMPLOYEE, 
            roleId: consultantRole._id, 
            clientIds: [testClient._id]
        });

        consultantToken = jwtService.sign({ sub: consultantUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => await assessmentModel.deleteMany({}));

    describe('POST /assessments - Creation & Logic', () => {
        it('should create an assessment and SNAPSHOT the variety from the block', async () => {
            const createDto: CreateAssessmentDto = {
                blockId: testBlock._id.toString(),
                date: new Date(),
                samples: []
            };

            const res = await request(app.getHttpServer())
                .post('/assessments')
                .set('Authorization', `Bearer ${consultantToken}`)
                .send(createDto)
                .expect(201);

            expect(res.body.recordId).toMatch(/^ASM\d{4}$/);
            // Verify Snapshot Logic: The assessment must store the varietyId, NOT lookup dynamically
            expect(res.body.varietyId).toBe((varietyGala as any)._id.toString());
            // Verify Default Status
            expect(res.body.status).toBe(AssessmentStatus.PENDING);
        });

        it('should calculate Summary Statistics (Source of Truth) from samples', async () => {
            const createDto: CreateAssessmentDto = {
                blockId: testBlock._id.toString(),
                date: new Date(),
                samples: [
                    { rowNumber: 1, totalFruit: 100, damagedFruit: 10 }, // 10%
                    { rowNumber: 2, totalFruit: 50, damagedFruit: 25 }   // 50%
                ]
            };

            const res = await request(app.getHttpServer())
                .post('/assessments')
                .set('Authorization', `Bearer ${consultantToken}`)
                .send(createDto)
                .expect(201);

            // Calculation Verification: (35 damaged / 150 total) * 100 = 23.33%
            expect(res.body.summary.totalSamples).toBe(2);
            expect(res.body.summary.totalFruit).toBe(150);
            expect(res.body.summary.totalDamaged).toBe(35);
            expect(res.body.summary.averageDamagePercentage).toBe(23.33);
            
            // Status Should default to IN_PROGRESS because samples exist
            expect(res.body.status).toBe(AssessmentStatus.IN_PROGRESS);
        });

        it('should fail if blockId is invalid', async () => {
            const createDto = {
                blockId: new Types.ObjectId().toString(), // Non-existent
                date: new Date()
            };
            await request(app.getHttpServer())
                .post('/assessments')
                .set('Authorization', `Bearer ${consultantToken}`)
                .send(createDto)
                .expect(404);
        });
    });

    describe('GET /assessments - Retrieval', () => {
        let assessment: AssessmentDocument;

        beforeEach(async () => {
            assessment = await assessmentModel.create({
                recordId: 'ASM_GET',
                blockId: testBlock._id,
                clientId: testClient._id,
                varietyId: varietyGala._id, // Snapshot
                date: new Date(),
                status: AssessmentStatus.PENDING,
                samples: [],
                summary: { totalSamples: 0, totalFruit: 0, totalDamaged: 0, averageDamagePercentage: 0 }
            });
        });

        it('should retrieve assessment with populated Variety name', async () => {
            const res = await request(app.getHttpServer())
                .get(`/assessments/${assessment._id}`)
                .set('Authorization', `Bearer ${consultantToken}`)
                .expect(200);

            expect(res.body.recordId).toBe('ASM_GET');
            // Check Population
            expect(res.body.varietyId).toHaveProperty('name', 'Gala');
            expect(res.body.blockId).toHaveProperty('name', 'Block A');
        });
    });

    describe('PATCH /assessments/:id - Updates & Recalculation', () => {
        let assessment: AssessmentDocument;

        beforeEach(async () => {
            assessment = await assessmentModel.create({
                recordId: 'ASM_PATCH',
                blockId: testBlock._id,
                clientId: testClient._id,
                varietyId: varietyGala._id,
                date: new Date(),
                status: AssessmentStatus.PENDING,
                samples: [],
                summary: { totalSamples: 0, totalFruit: 0, totalDamaged: 0, averageDamagePercentage: 0 }
            });
        });

        it('should update samples and RECALCULATE summary', async () => {
            const updateDto = {
                samples: [{ rowNumber: 1, totalFruit: 100, damagedFruit: 50 }], // 50% damage
                __v: assessment.__v
            };

            const res = await request(app.getHttpServer())
                .patch(`/assessments/${assessment._id}`)
                .set('Authorization', `Bearer ${consultantToken}`)
                .send(updateDto)
                .expect(200);

            // Verify Recalculation
            expect(res.body.summary.totalFruit).toBe(100);
            expect(res.body.summary.averageDamagePercentage).toBe(50.00);
            
            // Verify Auto-Status Transition (Pending -> In Progress)
            expect(res.body.status).toBe(AssessmentStatus.IN_PROGRESS);
            
            // Verify OCC
            expect(res.body.__v).toBe(assessment.__v + 1);
        });

        it('should fail update on Version Mismatch (OCC)', async () => {
            const updateDto = {
                status: AssessmentStatus.COMPLETED,
                __v: assessment.__v + 99 // Wrong version
            };

            await request(app.getHttpServer())
                .patch(`/assessments/${assessment._id}`)
                .set('Authorization', `Bearer ${consultantToken}`)
                .send(updateDto)
                .expect(409);
        });
    });

    describe('DELETE /assessments/:id', () => {
        let assessment: AssessmentDocument;
        beforeEach(async () => {
            assessment = await assessmentModel.create({
                recordId: 'ASM_DEL', blockId: testBlock._id, clientId: testClient._id, varietyId: varietyGala._id, date: new Date(),
            });
        });

        it('should soft-delete the assessment', async () => {
            await request(app.getHttpServer())
                .delete(`/assessments/${assessment._id}`)
                .set('Authorization', `Bearer ${consultantToken}`)
                .expect(200);

            const deleted = await assessmentModel.findById(assessment._id);
            expect(deleted!.isDeleted).toBe(true);
            expect(deleted!.isActive).toBe(false);
        });
    });
});