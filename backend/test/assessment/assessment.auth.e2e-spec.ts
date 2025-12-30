// backend/test/assessment/assessment.auth.e2e-spec.ts
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
import { Assessment, AssessmentDocument, AssessmentStatus } from '../../src/operations/assessments/schemas/assessment.schema';
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Assessments Authorization & Security (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let assessmentModel: Model<AssessmentDocument>;
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let varietyModel: Model<VarietyDocument>;

    // Tokens
    let adminToken: string;      // Global
    let managerToken: string;    // Subsidiary (Sub A)
    let ownerToken: string;      // Client (Client A1)
    let consultantToken: string; // Client (Client A1 - Read Only)
    let otherOwnerToken: string; // Client (Client B1 - Different Sub)

    // Entities
    let assessmentA1: AssessmentDocument; // Sub A, Client A1
    let assessmentA2: AssessmentDocument; // Sub A, Client A2
    let assessmentB1: AssessmentDocument; // Sub B, Client B1

    let blockA1: BlockDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        assessmentModel = app.get<Model<AssessmentDocument>>(getModelToken(Assessment.name));
        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // 1. Master Data
        const variety = await varietyModel.create({ name: 'Gala', recordId: 'VAR' });

        // 2. Hierarchy Setup
        const [subA, subB] = await subsidiaryModel.create([
            { recordId: 'SUB_A', name: 'Subsidiary A' },
            { recordId: 'SUB_B', name: 'Subsidiary B' },
        ]);

        const [clientA1, clientA2, clientB1] = await clientModel.create([
            { recordId: 'CLI_A1', name: 'Client A1', subsidiaryId: subA._id },
            { recordId: 'CLI_A2', name: 'Client A2', subsidiaryId: subA._id },
            { recordId: 'CLI_B1', name: 'Client B1', subsidiaryId: subB._id },
        ]);

        // Helper to build the chain
        const createChain = async (client: ClientDocument, suffix: string) => {
            const orchard = await orchardModel.create({ recordId: `ORC_${suffix}`, name: `Orchard ${suffix}`, clientId: client._id });
            const block = await blockModel.create({ 
                recordId: `BLK_${suffix}`, name: `Block ${suffix}`, orchardId: orchard._id, clientId: client._id, plantings: [{ varietyId: variety._id, treeCount: 10 }] 
            });
            const assessment = await assessmentModel.create({
                recordId: `ASM_${suffix}`,
                blockId: block._id,
                clientId: client._id, // Critical for Scope
                varietyId: variety._id,
                date: new Date(),
                status: AssessmentStatus.PENDING,
                samples: [],
                summary: { totalSamples: 0, totalFruit: 0, totalDamaged: 0, averageDamagePercentage: 0 }
            });
            return { block, assessment };
        };

        const chainA1 = await createChain(clientA1, 'A1');
        blockA1 = chainA1.block;
        assessmentA1 = chainA1.assessment;

        const chainA2 = await createChain(clientA2, 'A2');
        assessmentA2 = chainA2.assessment;

        const chainB1 = await createChain(clientB1, 'B1');
        assessmentB1 = chainB1.assessment;

        // 3. Roles
        const [adminRole, managerRole, ownerRole, consultantRole] = await roleModel.create([
            { recordId: 'ADM_ROL', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            // Manager: Full Access in Subsidiary
            { recordId: 'MGR_ROL', name: 'Manager', permissions: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_CREATE, PERMISSIONS.ASSESSMENT_EDIT, PERMISSIONS.ASSESSMENT_DELETE, PERMISSIONS.BLOCK_VIEW], visibilityScope: VisibilityScope.SUBSIDIARY },
            // Owner: Full Access in Client
            { recordId: 'OWN_ROL', name: 'Owner', permissions: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_CREATE, PERMISSIONS.ASSESSMENT_EDIT, PERMISSIONS.ASSESSMENT_DELETE, PERMISSIONS.BLOCK_VIEW], visibilityScope: VisibilityScope.CLIENT },
            // Consultant: Read Only in Client
            { recordId: 'CON_ROL', name: 'Consultant', permissions: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.BLOCK_VIEW], visibilityScope: VisibilityScope.CLIENT },
        ]);

        // 4. Users
        const createToken = async (recordId, roleId, clientIds) => {
            const user = await userModel.create({
                recordId, name: recordId, firstName: 'Test', lastName: 'User', email: `${recordId}@test.com`, userType: UserType.EMPLOYEE, roleId, clientIds
            });
            return jwtService.sign({ sub: user.recordId, tokenVersion: 0 });
        };

        adminToken = await createToken('ADMIN', adminRole._id, []);
        managerToken = await createToken('MANAGER', managerRole._id, [clientA1._id]); // Assigned to A1, should see A2 via Subsidiary Scope
        ownerToken = await createToken('OWNER', ownerRole._id, [clientA1._id]);
        consultantToken = await createToken('CONSULTANT', consultantRole._id, [clientA1._id]);
        otherOwnerToken = await createToken('OTHER', ownerRole._id, [clientB1._id]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    // --- READ Operations ---
    describe('Layer 2 - Visibility Scope (Read)', () => {
        it('Global Admin should see ALL assessments', async () => {
            const res = await request(app.getHttpServer()).get('/assessments').set('Authorization', `Bearer ${adminToken}`).expect(200);
            expect(res.body).toHaveLength(3);
        });

        it('Subsidiary Manager should see assessments in their Subsidiary (A1 & A2), but NOT B1', async () => {
            const res = await request(app.getHttpServer()).get('/assessments').set('Authorization', `Bearer ${managerToken}`).expect(200);
            expect(res.body).toHaveLength(2);
            const ids = res.body.map(a => a.recordId);
            expect(ids).toContain('ASM_A1');
            expect(ids).toContain('ASM_A2');
            expect(ids).not.toContain('ASM_B1');
        });

        it('Client Owner should see ONLY assessments in their specific Client (A1)', async () => {
            const res = await request(app.getHttpServer()).get('/assessments').set('Authorization', `Bearer ${ownerToken}`).expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('ASM_A1');
        });

        it('should return 404 when accessing an out-of-scope assessment ID', async () => {
            // Owner of A1 trying to view B1
            await request(app.getHttpServer()).get(`/assessments/${assessmentB1._id}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(404);
        });
    });

    // --- WRITE Operations ---
    describe('Layer 1 - Permissions (Write)', () => {
        describe('POST /assessments', () => {
            it('should allow Owner to create an assessment', async () => {
                const dto = { blockId: blockA1._id.toString(), date: new Date() };
                await request(app.getHttpServer()).post('/assessments')
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .send(dto).expect(201);
            });

            it('should FORBID Consultant (Read Only) from creating', async () => {
                const dto = { blockId: blockA1._id.toString(), date: new Date() };
                await request(app.getHttpServer()).post('/assessments')
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send(dto).expect(403);
            });
        });

        describe('PATCH /assessments/:id', () => {
            it('should allow Owner to update an assessment', async () => {
                await request(app.getHttpServer()).patch(`/assessments/${assessmentA1._id}`)
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .send({ isActive: false, __v: assessmentA1.__v }).expect(200);
            });

            it('should FORBID Consultant (Read Only) from updating', async () => {
                await request(app.getHttpServer()).patch(`/assessments/${assessmentA1._id}`)
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send({ isActive: false, __v: assessmentA1.__v }).expect(403);
            });
        });

        describe('DELETE /assessments/:id', () => {
            it('should allow Owner to delete an assessment', async () => {
                // Create temp to delete
                const temp = await assessmentModel.create({
                    recordId: 'TEMP', blockId: blockA1._id, clientId: blockA1.clientId, varietyId: blockA1.plantings[0].varietyId, date: new Date()
                });

                await request(app.getHttpServer()).delete(`/assessments/${temp._id}`)
                    .set('Authorization', `Bearer ${ownerToken}`).expect(200);
            });

            it('should FORBID Consultant (Read Only) from deleting', async () => {
                await request(app.getHttpServer()).delete(`/assessments/${assessmentA1._id}`)
                    .set('Authorization', `Bearer ${consultantToken}`).expect(403);
            });
        });
    });
});