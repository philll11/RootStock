// backend/test/block/block.crud.e2e-spec.ts
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
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CreateBlockDto } from '../../src/assets/blocks/dto/create-block.dto';

describe('Blocks CRUD & Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let varietyModel: Model<VarietyDocument>;

    // User Tokens
    let globalAdminToken: string;
    let clientOwnerToken: string;

    // Test Data
    let testClient: ClientDocument;
    let testOrchard: OrchardDocument;
    let varietyGala: VarietyDocument;
    let varietyFuji: VarietyDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // 1. Setup Master Data
        [varietyGala, varietyFuji] = await varietyModel.create([
            { name: 'Gala', recordId: 'VAR_001' },
            { name: 'Fuji', recordId: 'VAR_002' },
        ]);

        // 2. Setup Hierarchy
        testClient = await clientModel.create({ recordId: 'CLI_BLK', name: 'Block Test Client' });
        testOrchard = await orchardModel.create({ recordId: 'ORC_BLK', name: 'Block Test Orchard', clientId: testClient._id });

        // 3. Setup Roles & Users
        const [adminRole, ownerRole] = await roleModel.create([
            { recordId: 'ADM_ROL', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            { recordId: 'OWN_ROL', name: 'Owner', permissions: [PERMISSIONS.BLOCK_VIEW, PERMISSIONS.BLOCK_CREATE, PERMISSIONS.BLOCK_EDIT, PERMISSIONS.BLOCK_DELETE], visibilityScope: VisibilityScope.CLIENT },
        ]);

        const [adminUser, ownerUser] = await userModel.create([
            { recordId: 'ADM_BLK', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin_blk@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            { recordId: 'OWN_BLK', name: 'Owner', firstName: 'Owner', lastName: 'User', email: 'owner_blk@test.com', userType: UserType.CONTACT, roleId: ownerRole._id, clientIds: [testClient._id] },
        ]);

        globalAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        clientOwnerToken = jwtService.sign({ sub: ownerUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));
    beforeEach(async () => await blockModel.deleteMany({}));

    describe('POST /blocks - Creation', () => {
        it('should successfully create a valid block with plantings', async () => {
            const createDto: CreateBlockDto = {
                name: 'North Block A',
                orchardId: testOrchard._id.toString(),
                plantings: [
                    { varietyId: (varietyGala as any)._id.toString(), treeCount: 100 },
                    { varietyId: (varietyFuji as any)._id.toString(), treeCount: 50 }
                ]
            };

            const res = await request(app.getHttpServer())
                .post(`/blocks`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .send(createDto)
                .expect(201);

            expect(res.body.name).toBe(createDto.name);
            expect(res.body.recordId).toMatch(/^BLK\d{3,4}$/); // Matches BLK + sequence
            expect(res.body.plantings).toHaveLength(2);
            expect(res.body.clientId).toBe(testClient._id.toString()); // Verify Denormalization
        });

        it('should reject creation with duplicate name in same orchard (Uniqueness)', async () => {
            const createDto = { 
                name: 'Duplicate Block', 
                orchardId: testOrchard._id.toString(),
                plantings: [] 
            };
            
            // First Create
            await request(app.getHttpServer()).post(`/blocks`).set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(201);
            
            // Second Create (Should Fail)
            await request(app.getHttpServer()).post(`/blocks`).set('Authorization', `Bearer ${globalAdminToken}`).send(createDto).expect(409);
        });

        it('should validate invalid planting data (negative trees)', async () => {
            const invalidDto = {
                name: 'Bad Trees',
                orchardId: testOrchard._id.toString(),
                plantings: [{ varietyId: (varietyGala as any)._id.toString(), treeCount: -5 }]
            };
            await request(app.getHttpServer()).post(`/blocks`).set('Authorization', `Bearer ${globalAdminToken}`).send(invalidDto).expect(400);
        });
    });

    describe('GET /blocks - Retrieval', () => {
        let blockA: BlockDocument;
        beforeEach(async () => {
            blockA = await blockModel.create({
                recordId: 'BLK_GET_A',
                name: 'Block Alpha',
                orchardId: testOrchard._id,
                clientId: testClient._id,
                plantings: [{ varietyId: varietyGala._id, treeCount: 100 }]
            });
            await blockModel.create({
                recordId: 'BLK_GET_B',
                name: 'Block Beta',
                orchardId: testOrchard._id,
                clientId: testClient._id,
                plantings: []
            });
        });

        it('should list all blocks for the orchard', async () => {
            const res = await request(app.getHttpServer())
                .get(`/blocks?orchardId=${testOrchard._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200);
            
            expect(res.body).toHaveLength(2);
        });

        it('should retrieve a single block with populated variety details', async () => {
            const res = await request(app.getHttpServer())
                .get(`/blocks/${blockA._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200);

            expect(res.body.name).toBe('Block Alpha');
            expect(res.body.plantings[0].varietyId.name).toBe('Gala'); // Check population
        });
    });

    describe('PATCH /blocks/:blockId - Updates (OCC)', () => {
        let blockToUpdate: BlockDocument;

        beforeEach(async () => {
            blockToUpdate = await blockModel.create({
                recordId: 'BLK_PATCH',
                name: 'Original Name',
                orchardId: testOrchard._id,
                clientId: testClient._id,
                plantings: []
            });
        });

        it('should update successfully when correct __v is provided', async () => {
            const updateDto = {
                name: 'New Name',
                __v: blockToUpdate.__v
            };

            const res = await request(app.getHttpServer())
                .patch(`/blocks/${blockToUpdate._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body.name).toBe('New Name');
            // Mongoose increments version on update
            expect(res.body.__v).toBe(blockToUpdate.__v + 1);
        });

        it('should fail with 409 Conflict if __v does not match (Optimistic Concurrency)', async () => {
            const updateDto = {
                name: 'Stale Update',
                __v: blockToUpdate.__v + 1 // Simulating stale client
            };

            await request(app.getHttpServer())
                .patch(`/blocks/${blockToUpdate._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .send(updateDto)
                .expect(409);
        });
    });

    describe('DELETE /blocks/:blockId', () => {
        let blockToDelete: BlockDocument;
        beforeEach(async () => {
            blockToDelete = await blockModel.create({
                recordId: 'BLK_DEL',
                name: 'To Delete',
                orchardId: testOrchard._id,
                clientId: testClient._id,
            });
        });

        it('should soft-delete the block', async () => {
            await request(app.getHttpServer())
                .delete(`/blocks/${blockToDelete._id}`)
                .set('Authorization', `Bearer ${clientOwnerToken}`)
                .expect(200);

            const deleted = await blockModel.findById(blockToDelete._id);
            expect(deleted!.isDeleted).toBe(true);
            expect(deleted!.isActive).toBe(false);
        });
    });
});