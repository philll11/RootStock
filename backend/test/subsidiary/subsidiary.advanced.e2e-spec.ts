// backend/test/subsidiary/subsidiary.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';

import { Subsidiary, SubsidiaryDocument } from '../../src/subsidiaries/schemas/subsidiary.schema';
import { Client, ClientDocument } from '../../src/clients/schemas/client.schema';
import { User, UserDocument, UserType } from '../../src/users/schemas/user.schema';
import { Role, RoleDocument, VisibilityScope } from '../../src/roles/schemas/role.schema';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { UpdateSubsidiaryDto } from '../../src/subsidiaries/dto/update-subsidiary.dto';

describe('Subsidiaries Advanced Business Logic (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let subsidiaryModel: Model<SubsidiaryDocument>;
    let clientModel: Model<ClientDocument>;

    // Tokens
    let platformAdminToken: string;

    jest.setTimeout(90000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        subsidiaryModel = app.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));
        clientModel = app.get<Model<ClientDocument>>(getModelToken(Client.name));
        const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        const adminRole = await roleModel.create({
            recordId: 'ROLE_ADMIN_SUB_ADV',
            name: 'Admin',
            permissions: Object.values(PERMISSIONS),
            visibilityScope: VisibilityScope.GLOBAL,
        });

        const adminUser = await userModel.create({
            recordId: 'USER_ADMIN_SUB_ADV',
            name: 'Admin',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin.sub.adv@test.com',
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id,
        });
        platformAdminToken = jwtService.sign({ sub: adminUser.recordId });
    });

    afterAll(async () => await teardownTestApp({ app, mongod }));

    beforeEach(async () => { 
        await subsidiaryModel.deleteMany({}); 
        await clientModel.deleteMany({});
    });

    describe('Transactional Operations - Deletion Integrity', () => {
        it.todo('should handle concurrent deletions gracefully - Requires implementation');
        it.todo('should correctly throw 409 Conflict when trying to delete a subsidiary with active clients');
    });

    describe('Business Rule Enforcement - Deactivation Pre-condition', () => {
        it('should prevent deactivation if active clients exist and provide a detailed error', async () => {
            const parentSubsidiary = await subsidiaryModel.create({ recordId: 'SUB_DEACTIVATE', name: 'Deactivation Test' });
            await clientModel.create([
                { recordId: 'CLI_ACTIVE_1', name: 'Active Client 1', subsidiaryId: parentSubsidiary._id, isActive: true },
                { recordId: 'CLI_ACTIVE_2', name: 'Active Client 2', subsidiaryId: parentSubsidiary._id, isActive: true },
                { recordId: 'CLI_INACTIVE_1', name: 'Inactive Client', subsidiaryId: parentSubsidiary._id, isActive: false },
            ]);
            const updateDto: UpdateSubsidiaryDto = { isActive: false };

            const res = await request(app.getHttpServer()).patch(`/subsidiaries/${parentSubsidiary._id}`).set('Authorization', `Bearer ${platformAdminToken}`).send(updateDto).expect(409);
            
            expect(res.body.message).toContain('cannot be deactivated');
            expect(res.body.message).toContain('2 active client(s)');
        });

        it('should allow deactivation when all clients are inactive', async () => {
            const parentSubsidiary = await subsidiaryModel.create({ recordId: 'SUB_DEACTIVATE_OK', name: 'Deactivation OK' });
            await clientModel.create([
                { recordId: 'CLI_INACTIVE_2', name: 'Inactive Client', subsidiaryId: parentSubsidiary._id, isActive: false },
            ]);
            const updateDto: UpdateSubsidiaryDto = { isActive: false };

            await request(app.getHttpServer()).patch(`/subsidiaries/${parentSubsidiary._id}`).set('Authorization', `Bearer ${platformAdminToken}`).send(updateDto).expect(200);
        });
    });

    describe('Nested Route Operations - /subsidiaries/:id/clients', () => {
        let parentSubsidiary: SubsidiaryDocument;

        beforeEach(async () => {
            parentSubsidiary = await subsidiaryModel.create({ recordId: 'SUB_NESTED', name: 'Nested Route Test' });
            await clientModel.create([
                { recordId: 'CLI_NESTED_1', name: 'Nested 1', subsidiaryId: parentSubsidiary._id, isActive: true },
                { recordId: 'CLI_NESTED_2', name: 'Nested 2', subsidiaryId: parentSubsidiary._id, isActive: false },
            ]);
        });

        it('should return only active clients for a valid subsidiary by default', async () => {
            const res = await request(app.getHttpServer()).get(`/subsidiaries/${parentSubsidiary._id}/clients`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            
            expect(res.body).toHaveLength(1);
            expect(res.body[0].recordId).toBe('CLI_NESTED_1');
        });

        it('should return all clients when including inactives', async () => {
            const res = await request(app.getHttpServer()).get(`/subsidiaries/${parentSubsidiary._id}/clients?includeInactives=true`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200);
            
            expect(res.body).toHaveLength(2);
        });

        it('should return 404 if the parent subsidiary does not exist', async () => {
            const fakeId = new Types.ObjectId().toHexString();
            await request(app.getHttpServer()).get(`/subsidiaries/${fakeId}/clients`).set('Authorization', `Bearer ${platformAdminToken}`).expect(404);
        });
    });
});