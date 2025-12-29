import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User, UserDocument, UserType } from '../../src/iam/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/iam/roles/schemas/role.schema';
import { Variety, VarietyDocument } from '../../src/master-data/varieties/schemas/variety.schema';
import { Block, BlockDocument } from '../../src/assets/blocks/schemas/block.schema';
import { Orchard, OrchardDocument } from '../../src/assets/orchards/schemas/orchard.schema';
import { Client, ClientDocument } from '../../src/iam/clients/schemas/client.schema';

describe('Varieties Advanced Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;
    
    // Models
    let varietyModel: Model<VarietyDocument>;
    let blockModel: Model<BlockDocument>;
    let orchardModel: Model<OrchardDocument>;
    let clientModel: Model<ClientDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;
    
    // Tokens
    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        varietyModel = app.get<Model<VarietyDocument>>(getModelToken(Variety.name));
        blockModel = app.get<Model<BlockDocument>>(getModelToken(Block.name));
        orchardModel = app.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create Admin Role and User
        const adminRole = await roleModel.create({
            recordId: 'ADMIN_ROLE',
            name: 'Admin Role',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL
        });

        const adminUser = await userModel.create({
            recordId: 'ADMIN_USER',
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@test.com',
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id
        });

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    describe('Dependency Integrity (Blocks)', () => {
        let varietyId: string;
        let blockId: string;

        beforeEach(async () => {
            await varietyModel.deleteMany({});
            await blockModel.deleteMany({});
            await orchardModel.deleteMany({});
            await clientModel.deleteMany({});

            // 1. Create Variety
            const variety = await varietyModel.create({
                recordId: 'VAR_DEP',
                name: 'Dependency Variety',
                isActive: true
            });
            varietyId = (variety as any)._id.toString();

            // 2. Create Client & Orchard (Required for Block)
            const client = await clientModel.create({ recordId: 'CLI_DEP', name: 'Dep Client' });
            const orchard = await orchardModel.create({ 
                recordId: 'ORC_DEP', 
                name: 'Dep Orchard', 
                clientId: client._id 
            });

            // 3. Create Block referencing Variety
            const block = await blockModel.create({
                recordId: 'BLK_DEP',
                name: 'Dep Block',
                orchardId: orchard._id,
                clientId: client._id,
                isActive: true,
                plantings: [{ varietyId: variety._id, treeCount: 100 }]
            });
            blockId = (block as any)._id.toString();
        });

        it('should prevent deletion if variety is used in an active Block', async () => {
            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(409); // Conflict
        });

        it('should allow deletion if Block is deleted (soft delete)', async () => {
            // Soft delete the block
            await blockModel.findByIdAndUpdate(blockId, { isDeleted: true, isActive: false });

            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });

        it('should allow deletion if Block is active but does not reference the variety', async () => {
            // Update block to remove reference (e.g. replant)
            await blockModel.findByIdAndUpdate(blockId, { plantings: [] });

            await request(app.getHttpServer())
                .delete(`/varieties/${varietyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });
    });
});
