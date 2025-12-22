// backend/test/block/block.advanced.e2e-spec.ts
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

describe('Blocks Advanced Logic - Integrity & Constraints (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let varietyModel: Model<VarietyDocument>;

    // Tokens
    let adminToken: string;

    // Entities
    let clientA: ClientDocument;
    let orchardA: OrchardDocument; // Target Orchard
    let orchardB: OrchardDocument; // Different Orchard
    let blockA: BlockDocument;
    let varietyGala: VarietyDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        const clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));

        // Setup
        varietyGala = await varietyModel.create({ name: 'Gala', recordId: 'VAR_001' });
        
        clientA = await clientModel.create({ recordId: 'CLI_ADV', name: 'Adv Client' });
        
        [orchardA, orchardB] = await orchardModel.create([
            { recordId: 'ORC_A', name: 'Orchard A', clientId: clientA._id },
            { recordId: 'ORC_B', name: 'Orchard B', clientId: clientA._id },
        ]);

        const adminRole = await roleModel.create({ 
            recordId: 'ADM', name: 'Admin', firstName: 'Admin', lastName: 'User', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL 
        });

        const adminUser = await userModel.create({
            recordId: 'ADM', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@adv.com', userType: UserType.EMPLOYEE, roleId: adminRole._id
        });

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        blockA = await blockModel.create({
            recordId: 'BLK_A', name: 'Block A', orchardId: orchardA._id, clientId: clientA._id, 
            plantings: [{ varietyId: varietyGala._id, treeCount: 100 }]
        });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    describe('Integrity Rule: Immutability (Layer 3)', () => {
        it('should NOT allow moving a block to a different orchard (orchardId is immutable)', async () => {
            // Attempt to move Block A to Orchard B
            // Because forbidNonWhitelisted: true is set globally, this should fail with 400 Bad Request
            await request(app.getHttpServer())
                .patch(`/orchards/${orchardA._id}/blocks/${blockA._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ orchardId: orchardB._id.toString(), __v: blockA.__v })
                .expect(400); 

            // Assert: Verify it did NOT change in DB
            const refreshed = await blockModel.findById(blockA._id);
            expect(refreshed!.orchardId.toString()).toBe(orchardA._id.toString());
        });

        it('should NOT allow changing the denormalized clientId', async () => {
            // Attempt to change Block A's clientId to a different client
            // Because forbidNonWhitelisted: true is set globally, this should fail with 400 Bad Request
             await request(app.getHttpServer())
                .patch(`/orchards/${orchardA._id}/blocks/${blockA._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ clientId: new Types.ObjectId().toString(), __v: blockA.__v })
                .expect(400);

            const refreshed = await blockModel.findById(blockA._id);
            expect(refreshed!.clientId.toString()).toBe(clientA._id.toString());
        });
    });

    describe('Integrity Rule: Uniqueness Scope', () => {
        it('should allow same block name in DIFFERENT orchards', async () => {
            // Block A exists in Orchard A.
            // Create "Block A" in Orchard B.
            const dto = { name: 'Block A', plantings: [{ varietyId: (varietyGala as any)._id.toString(), treeCount: 50 }] };
            
            await request(app.getHttpServer())
                .post(`/orchards/${orchardB._id}/blocks`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto).expect(201);
        });

        it('should REJECT same block name in SAME orchard', async () => {
            const dto = { name: 'Block A', plantings: [] };
            await request(app.getHttpServer())
                .post(`/orchards/${orchardA._id}/blocks`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dto).expect(409);
        });
    });

    // TODO: This test requires logic in OrchardsService.remove() to check for active children
    // Current implementation: "TODO: Add Layer 3 check for active child Blocks before deletion."
    // Once implemented, uncomment this test.
    /*
    describe('Integrity Rule: Parent Deletion Constraint', () => {
        it('should PREVENT deleting an Orchard if it has active Blocks', async () => {
             await request(app.getHttpServer())
                .delete(`/orchards/${orchardA._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(409); // Expect Conflict
        });
    });
    */
});