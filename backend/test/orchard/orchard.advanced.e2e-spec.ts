// backend/test/orchard/orchard.advanced.e2e-spec.ts
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
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';

describe('Orchards Advanced Logic - Integrity & Constraints (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let blockModel: Model<BlockDocument>;

    // Tokens
    let adminToken: string;

    // Entities
    let testClient: ClientDocument;
    let testOrchard: OrchardDocument;
    let targetUser: UserDocument; // User to be assigned
    let adminUser: UserDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // 1. Setup Admin Role & User
        const adminRole = await roleModel.create({ 
            recordId: 'ADM', name: 'Admin', permissions: Object.values(PERMISSIONS), visibilityScope: VisibilityScope.GLOBAL 
        });
        adminUser = await userModel.create({
            recordId: 'ADM_USR', name: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@orch.com', userType: UserType.EMPLOYEE, roleId: adminRole._id
        });
        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // 2. Setup Client
        testClient = await clientModel.create({ recordId: 'CLI_ADV', name: 'Orchard Logic Client', isActive: true });

        // 3. Setup Target User (Not yet assigned to Client)
        targetUser = await userModel.create({
            recordId: 'TGT_USR', name: 'Target User', firstName: 'Target', lastName: 'User', email: 'target@orch.com', userType: UserType.EMPLOYEE, roleId: adminRole._id, clientIds: []
        });

        // 4. Setup Orchard
        testOrchard = await orchardModel.create({
            recordId: 'ORC_ADV', name: 'Advanced Orchard', clientId: testClient._id, userIds: [], isActive: true
        });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    describe('Integrity Rule: Immutability (Layer 3)', () => {
        it('should NOT allow changing the parent clientId', async () => {
            // Attempt to change clientId to a random ID
            // Expect 400 because 'clientId' is not in UpdateOrchardDto (Whitelisted)
            await request(app.getHttpServer())
                .patch(`/orchards/${testOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    clientId: new Types.ObjectId().toString(),
                    __v: testOrchard.__v
                })
                .expect(400);

            const refreshed = await orchardModel.findById(testOrchard._id);
            expect(refreshed!.clientId.toString()).toBe(testClient._id.toString());
        });
    });

    describe('Business Logic: Smart Assignment', () => {
        it('should automatically assign the parent Client to a User when they are assigned to the Orchard', async () => {
            // Pre-condition: User has no clients
            let user = await userModel.findById(targetUser._id);
            expect(user!.clientIds).toHaveLength(0);

            // Action: Assign User to Orchard
            await request(app.getHttpServer())
                .patch(`/orchards/${testOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    userIds: [targetUser._id.toString()],
                    __v: testOrchard.__v
                })
                .expect(200);

            // Post-condition: User should now have the Client ID
            user = await userModel.findById(targetUser._id);
            expect(user!.clientIds.map(id => id.toString())).toContain(testClient._id.toString());
            
            // Post-condition: Orchard should have the User ID
            const orchard = await orchardModel.findById(testOrchard._id);
            expect(orchard!.userIds.map(id => id.toString())).toContain(targetUser._id.toString());
        });
    });

describe('Constraint: Parent/Child Dependencies', () => {
        // Create isolated entities for this test block to avoid "Active User" pollution
        let depClient: ClientDocument;
        let depOrchard: OrchardDocument;

        beforeEach(async () => {
             depClient = await clientModel.create({ recordId: 'CLI_DEP', name: 'Dependency Client', isActive: true });
             depOrchard = await orchardModel.create({ 
                 recordId: 'ORC_DEP', name: 'Dependency Orchard', clientId: depClient._id, userIds: [], isActive: true 
             });
        });

        afterEach(async () => {
            await blockModel.deleteMany({ clientId: depClient._id });
            await orchardModel.deleteMany({ clientId: depClient._id });
            await clientModel.deleteOne({ _id: depClient._id });
        });

        // 1. Orchard cannot be deleted if it has active Blocks
        it('should PREVENT deleting an Orchard if it has active Blocks', async () => {
            // Create a child Block
            await blockModel.create({
                recordId: 'BLK_DEP', name: 'Dependency Block', orchardId: depOrchard._id, clientId: depClient._id, plantings: []
            });

            // Attempt Delete -> Expect 409 Conflict
            await request(app.getHttpServer())
                .delete(`/orchards/${depOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(409); // "Cannot delete orchard because it has active block(s)"
        });

        // 2. Client cannot be deactivated if it has active Orchards
        it('should PREVENT deactivating a Client if it has active Orchards', async () => {
            // Attempt Deactivate Client -> Expect 409 Conflict
            const res = await request(app.getHttpServer())
                .patch(`/clients/${depClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    isActive: false,
                    __v: depClient.__v
                })
                .expect(409);
            
            // Now this matches because we guaranteed no Users are on this fresh client
            expect(res.body.message).toMatch(/cannot be deactivated.*active orchard/i);
        });

        it('should ALLOW deleting an Orchard once children are handled', async () => {
            // Create the block first
            await blockModel.create({
                recordId: 'BLK_DEP_2', name: 'Dependency Block 2', orchardId: depOrchard._id, clientId: depClient._id, plantings: []
            });

            // 1. Soft Delete the child Block first
            await blockModel.updateOne({ recordId: 'BLK_DEP_2' }, { isDeleted: true, isActive: false });

            // 2. Now Delete Orchard -> Expect 200 OK
            await request(app.getHttpServer())
                .delete(`/orchards/${depOrchard._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            const deletedOrchard = await orchardModel.findById(depOrchard._id);
            expect(deletedOrchard!.isDeleted).toBe(true);
            expect(deletedOrchard!.isActive).toBe(false);
        });

        it('should ALLOW deactivating a Client once Orchards are inactive', async () => {
            // 1. Soft Delete the Orchard first
            await orchardModel.updateOne({ _id: depOrchard._id }, { isDeleted: true, isActive: false });
            
            // Attempt Deactivate Client -> Expect 200 OK
            await request(app.getHttpServer())
                .patch(`/clients/${depClient._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    isActive: false,
                    __v: depClient.__v
                })
                .expect(200);
            
            const inactiveClient = await clientModel.findById(depClient._id);
            expect(inactiveClient!.isActive).toBe(false);
        });
    });

});