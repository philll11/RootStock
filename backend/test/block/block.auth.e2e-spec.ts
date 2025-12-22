// backend/test/block/block.auth.e2e-spec.ts
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
import { Subsidiary, SubsidiaryDocument } from '../../src/iam/subsidiaries/schemas/subsidiary.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Blocks Authorization & Security - Agricultural Business Scenarios (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let varietyModel: Model<VarietyDocument>;

    // Tokens
    let platformAdminToken: string, regionManagerToken: string, farmOwnerToken: string, consultantToken: string, unauthorizedUserToken: string;

    // Entities
    let appleClient: ClientDocument, citrusClient: ClientDocument, berryClient: ClientDocument;
    let orchardA: OrchardDocument, orchardB: OrchardDocument, orchardC: OrchardDocument;
    let blockA: BlockDocument, blockB: BlockDocument, blockC: BlockDocument;
    let varietyGala: VarietyDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
        const subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

        // 1. Setup Master Data
        varietyGala = await varietyModel.create({ name: 'Gala', recordId: 'VAR_001' });

        // 2. Setup Hierarchy
        const [subCA, subOR] = await subsidiaryModel.create([
            { recordId: 'SUB_CA', name: 'California Ag' },
            { recordId: 'SUB_OR', name: 'Oregon Ag' },
        ]);

        [appleClient, citrusClient, berryClient] = await clientModel.create([
            { recordId: 'CLI_APPLE', name: 'Apple Co', subsidiaryId: subCA._id },
            { recordId: 'CLI_CITRUS', name: 'Citrus Co', subsidiaryId: subCA._id }, // Same Sub as Apple
            { recordId: 'CLI_BERRY', name: 'Berry Co', subsidiaryId: subOR._id },   // Different Sub
        ]);

        [orchardA, orchardB, orchardC] = await orchardModel.create([
            { recordId: 'ORC_A', name: 'Apple Orchard', clientId: appleClient._id },
            { recordId: 'ORC_B', name: 'Citrus Orchard', clientId: citrusClient._id },
            { recordId: 'ORC_C', name: 'Berry Orchard', clientId: berryClient._id },
        ]);

        // 3. Setup Roles
        const [adminRole, managerRole, ownerRole, consultantRole, noPermsRole] = await roleModel.create([
            { recordId: 'ADM_ROL', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL },
            // Manager: Can Manage Blocks in Subsidiary
            { recordId: 'MGR_ROL', name: 'Manager', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.BLOCK_VIEW, PERMISSIONS.BLOCK_CREATE, PERMISSIONS.BLOCK_EDIT, PERMISSIONS.BLOCK_DELETE], visibilityScope: VisibilityScope.SUBSIDIARY },
            // Owner: Can Manage Blocks in Client
            { recordId: 'OWN_ROL', name: 'Owner', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.BLOCK_VIEW, PERMISSIONS.BLOCK_CREATE, PERMISSIONS.BLOCK_EDIT, PERMISSIONS.BLOCK_DELETE], visibilityScope: VisibilityScope.CLIENT },
            // Consultant: View Only
            { recordId: 'CON_ROL', name: 'Consultant', permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.BLOCK_VIEW], visibilityScope: VisibilityScope.CLIENT },
            { recordId: 'NO_PERMS', name: 'No Perms', permissions: [], visibilityScope: VisibilityScope.CLIENT },
        ]);

        // 4. Setup Users
        const [adminUser, managerUser, ownerUser, consultantUser, unauthUser] = await userModel.create([
            { recordId: 'ADMIN', name: 'Admin User', firstName: 'Admin', lastName: 'User', email: 'admin@test.com', userType: UserType.EMPLOYEE, roleId: adminRole._id },
            // Manager of CA Subsidiary (Should see Apple & Citrus, NOT Berry)
            { recordId: 'MANAGER', name: 'Manager User', firstName: 'Manager', lastName: 'User', email: 'manager@test.com', userType: UserType.EMPLOYEE, roleId: managerRole._id, clientIds: [appleClient._id] },
            // Owner of Apple Client (Should see Apple, NOT Citrus)
            { recordId: 'OWNER', name: 'Owner User', firstName: 'Owner', lastName: 'User', email: 'owner@test.com', userType: UserType.EMPLOYEE, roleId: ownerRole._id, clientIds: [appleClient._id] },
            // Consultant for Apple Client (Read Only)
            { recordId: 'CONSULTANT', name: 'Consultant User', firstName: 'Consultant', lastName: 'User', email: 'consultant@test.com', userType: UserType.EMPLOYEE, roleId: consultantRole._id, clientIds: [appleClient._id] },
            { recordId: 'UNAUTH', name: 'Unauth User', firstName: 'Unauth', lastName: 'User', email: 'unauth@test.com', userType: UserType.EMPLOYEE, roleId: noPermsRole._id, clientIds: [appleClient._id] },
        ]);

        platformAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
        regionManagerToken = jwtService.sign({ sub: managerUser.recordId, tokenVersion: 0 });
        farmOwnerToken = jwtService.sign({ sub: ownerUser.recordId, tokenVersion: 0 });
        consultantToken = jwtService.sign({ sub: consultantUser.recordId, tokenVersion: 0 });
        unauthorizedUserToken = jwtService.sign({ sub: unauthUser.recordId, tokenVersion: 0 });

        // 5. Create Blocks
        [blockA, blockB, blockC] = await blockModel.create([
            { recordId: 'BLK_A', name: 'Block A (Apple)', orchardId: orchardA._id, clientId: appleClient._id, plantings: [{ varietyId: varietyGala._id, treeCount: 100 }] },
            { recordId: 'BLK_B', name: 'Block B (Citrus)', orchardId: orchardB._id, clientId: citrusClient._id, plantings: [] },
            { recordId: 'BLK_C', name: 'Block C (Berry)', orchardId: orchardC._id, clientId: berryClient._id, plantings: [] },
        ]);
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    // --- READ Operations (GET) ---
    describe('Layer 2 - Data Visibility Scope (Read)', () => {
        // Blocks are fetched via orchard parent endpoint, but security check happens there too.
        
        it('Global Admin should see blocks from ALL orchards', async () => {
            // Check Block A
            await request(app.getHttpServer()).get(`/orchards/${orchardA._id}/blocks/${blockA._id}`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            // Check Block C (Different Sub)
            await request(app.getHttpServer()).get(`/orchards/${orchardC._id}/blocks/${blockC._id}`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
        });

        it('Subsidiary Manager should see blocks in their subsidiary (Apple & Citrus), but NOT others (Berry)', async () => {
            // Should see Apple (Direct Client)
            await request(app.getHttpServer()).get(`/orchards/${orchardA._id}/blocks/${blockA._id}`).set('Authorization', `Bearer ${regionManagerToken}`).expect(200);
            // Should see Citrus (Same Subsidiary)
            await request(app.getHttpServer()).get(`/orchards/${orchardB._id}/blocks/${blockB._id}`).set('Authorization', `Bearer ${regionManagerToken}`).expect(200);
            // Should NOT see Berry (Different Subsidiary) - 404 because parent orchard check fails or block check fails
            await request(app.getHttpServer()).get(`/orchards/${orchardC._id}/blocks/${blockC._id}`).set('Authorization', `Bearer ${regionManagerToken}`).expect(404);
        });

        it('Client Owner should see blocks ONLY in their specific client', async () => {
            // Should see Apple
            await request(app.getHttpServer()).get(`/orchards/${orchardA._id}/blocks`).set('Authorization', `Bearer ${farmOwnerToken}`).expect(200);
            // Should NOT see Citrus (Same Subsidiary, Different Client)
            await request(app.getHttpServer()).get(`/orchards/${orchardB._id}/blocks`).set('Authorization', `Bearer ${farmOwnerToken}`).expect(404);
        });

        it('should return 403 for user without BLOCK_VIEW permission', async () => {
            await request(app.getHttpServer()).get(`/orchards/${orchardA._id}/blocks`).set('Authorization', `Bearer ${unauthorizedUserToken}`).expect(403);
        });
    });

    // --- WRITE Operations (POST, PATCH, DELETE) ---
    describe('Layer 1 & 3 - Actions and Business Rules (Write)', () => {

        describe('POST /orchards/:id/blocks - Creation Rules', () => {
            it('should allow Owner to create a block in their orchard', async () => {
                const dto = { name: 'New Block', plantings: [{ varietyId: (varietyGala as any)._id.toString(), treeCount: 10 }] };
                await request(app.getHttpServer()).post(`/orchards/${orchardA._id}/blocks`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send(dto).expect(201);
            });

            it('should FORBID Consultant (No Create Perm) from creating a block', async () => {
                const dto = { name: 'Fail Block', plantings: [] };
                await request(app.getHttpServer()).post(`/orchards/${orchardA._id}/blocks`)
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send(dto).expect(403);
            });

            it('should FORBID Owner from creating a block in an Orchard they do not own (Layer 2)', async () => {
                // Owner of Apple trying to create in Citrus Orchard
                const dto = { name: 'Sneaky Block', plantings: [] };
                await request(app.getHttpServer()).post(`/orchards/${orchardB._id}/blocks`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`) // Apple Owner
                    .send(dto).expect(404); // 404 because they can't "see" Orchard B to validate it
            });
        });

        describe('PATCH /orchards/:id/blocks/:id - Update Rules', () => {
            it('should allow Owner to update a block', async () => {
                await request(app.getHttpServer())
                    .patch(`/orchards/${orchardA._id}/blocks/${blockA._id}`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`)
                    .send({ name: 'Renamed Block', __v: blockA.__v }).expect(200);
            });

            it('should FORBID Consultant (Read Only) from updating a block', async () => {
                await request(app.getHttpServer())
                    .patch(`/orchards/${orchardA._id}/blocks/${blockA._id}`)
                    .set('Authorization', `Bearer ${consultantToken}`)
                    .send({ name: 'Hacked Block', __v: blockA.__v }).expect(403);
            });
        });

        describe('DELETE /orchards/:id/blocks/:id - Deletion Rules', () => {
            it('should allow Owner to delete a block', async () => {
                // Create temp block
                const tempBlock = await blockModel.create({ 
                    recordId: 'TEMP', name: 'Del Me', orchardId: orchardA._id, clientId: appleClient._id, plantings: [] 
                });

                await request(app.getHttpServer())
                    .delete(`/orchards/${orchardA._id}/blocks/${tempBlock._id}`)
                    .set('Authorization', `Bearer ${farmOwnerToken}`).expect(200);
            });

            it('should FORBID Consultant from deleting a block', async () => {
                await request(app.getHttpServer())
                    .delete(`/orchards/${orchardA._id}/blocks/${blockA._id}`)
                    .set('Authorization', `Bearer ${consultantToken}`).expect(403);
            });
        });
    });
});