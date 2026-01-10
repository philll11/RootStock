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
import { SystemConfig, SystemConfigDocument } from '../../src/system/config/schemas/system-config.schema';
import { UpdateSystemConfigDto } from '../../src/system/config/dto/update-system-config.dto';

describe('System Config CRUD (e2e)', () => {
    let app: INestApplication;
    let mongod: MongoMemoryReplSet;
    let jwtService: JwtService;

    // Models
    let systemConfigModel: Model<SystemConfigDocument>;
    let userModel: Model<UserDocument>;
    let roleModel: Model<RoleDocument>;

    // Auth
    let globalAdminToken: string;

    // Test Data
    let auditConfig: SystemConfigDocument;

    jest.setTimeout(60000);

    beforeAll(async () => {
        ({ app, mongod, jwtService } = await setupTestApp());

        // Get Models
        systemConfigModel = app.get<Model<SystemConfigDocument>>(getModelToken(SystemConfig.name));
        userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
        roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));

        // Create admin role and user
        const [adminRole] = await roleModel.create([{
            recordId: 'ROLE_SYS_CONFIG_ADMIN', name: 'System Config Admin',
            permissions: [PERMISSIONS.SYSTEM_CONFIG_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT],
            visibilityScope: VisibilityScope.GLOBAL
        }]);

        const [adminUser] = await userModel.create([{
            recordId: 'USER_SYS_CONFIG_ADMIN', name: 'System Config Admin',
            firstName: 'System', lastName: 'Admin',
            email: 'sysconfig.admin@example.com',
            userType: UserType.EMPLOYEE, roleId: adminRole._id
        }]);
        
        globalAdminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Create test configs
        [auditConfig] = await systemConfigModel.create([
            { key: 'audit', value: { enabled: true, retentionDays: 90 }, description: 'Audit Settings' },
            { key: 'theme', value: { primaryColor: 'blue' }, description: 'Theme Settings' },
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, mongod });
    });

    describe('GET /system/config', () => {
        it('should return a list of all system configs', async () => {
            const res = await request(app.getHttpServer())
                .get('/system/config')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            const foundConfig = res.body.find(c => c.key === 'audit');
            expect(foundConfig).toBeDefined();
            expect(foundConfig.value).toEqual(auditConfig.value);
        });
    });

    describe('GET /system/config/:key', () => {
        it('should return a specific system config by key', async () => {
            const res = await request(app.getHttpServer())
                .get('/system/config/audit')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(res.body).toEqual(auditConfig.value);
        });

        it('should return null or 404 for non-existent key', async () => {
             // The service returns null, controller returns it directly. 
             // Depending on implementation it might be 200 OK with empty body or null.
             // Let's check what the service does. It returns null.
             // NestJS default behavior for returning null is 200 OK with empty body.
             const res = await request(app.getHttpServer())
                .get('/system/config/non-existent')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);
            
            expect(res.body).toEqual({});
        });
    });

    describe('PATCH /system/config/:key', () => {
        it("should update a system config's value", async () => {
            const updateDto: UpdateSystemConfigDto = { 
                value: { enabled: false, retentionDays: 30 }
            };

            const res = await request(app.getHttpServer())
                .patch('/system/config/audit')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body.success).toBe(true);

            // Verify update
            const updatedConfig = await systemConfigModel.findOne({ key: 'audit' });
            expect(updatedConfig).not.toBeNull();
            expect(updatedConfig!.value).toEqual(updateDto.value);
        });

        it("should create a new system config if key doesn't exist (upsert)", async () => {
            const updateDto: UpdateSystemConfigDto = { 
                value: { featureX: 'enabled' }
            };

            const res = await request(app.getHttpServer())
                .patch('/system/config/new-feature')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body.success).toBe(true);

            // Verify creation
            const newConfig = await systemConfigModel.findOne({ key: 'new-feature' });
            expect(newConfig).toBeDefined();
            expect(newConfig).not.toBeNull();
            expect(newConfig!.value).toEqual(updateDto.value);
        });
    });
});
