// backend/src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Role, VisibilityScope } from './iam/roles/schemas/role.schema';
import { getModelToken } from '@nestjs/mongoose';
import { PERMISSIONS } from './common/constants/permissions.constants';
import { Counter } from './system/counters/schemas/counter.schema';
import { User, UserType } from './iam/users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Subsidiary } from './iam/subsidiaries/schemas/subsidiary.schema';
import { Client } from './iam/clients/schemas/client.schema';
import { Orchard } from './assets/orchards/schemas/orchard.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);

  try {
    console.log('Starting database seeding process...');

    const roleModel = app.get(getModelToken(Role.name));
    const counterModel = app.get(getModelToken(Counter.name));
    const userModel = app.get(getModelToken(User.name));
    const subsidiaryModel = app.get(getModelToken(Subsidiary.name));
    const clientModel = app.get(getModelToken(Client.name));
    const orchardModel = app.get(getModelToken(Orchard.name));

    // ---------------------------------------------------------
    // 1. ESSENTIAL SYSTEM DATA (Runs in ALL Environments)
    // ---------------------------------------------------------

    // --- Counters ---
    const seedCounters = [
      { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 },
      { _id: 'client', prefix: 'CLI', sequence_value: 0 },
      { _id: 'user', prefix: 'USR', sequence_value: 1 },
      { _id: 'role', prefix: 'ROL', sequence_value: 0 },
      { _id: 'orchard', prefix: 'ORC', sequence_value: 0 },
      { _id: 'block', prefix: 'BLK', sequence_value: 0 },
      { _id: 'assessment', prefix: 'ASM', sequence_value: 0 },
    ];

    for (const counterData of seedCounters) {
      await counterModel.findOneAndUpdate(
        { _id: counterData._id },
        { $setOnInsert: counterData },
        { upsert: true, new: true },
      );
    }
    console.log('Verified System Counters.');

    // --- Roles ---
    const seedRoles = [
      {
        recordId: 'ROLE_ADMINISTRATOR',
        name: 'Administrator',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: Object.values(PERMISSIONS),
        isActive: true,
      },
      {
        recordId: 'ROLE_CONSULTANT',
        name: 'Consultant',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.VARIETY_VIEW,
          PERMISSIONS.BLOCK_VIEW,
          PERMISSIONS.ASSESSMENT_VIEW,
          PERMISSIONS.ASSESSMENT_CREATE,
          PERMISSIONS.ASSESSMENT_EDIT,
        ],
        isActive: true,
      },
      {
        recordId: 'ROLE_GROWER',
        name: 'Grower',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.BLOCK_VIEW,
          PERMISSIONS.ASSESSMENT_VIEW,
        ],
        isActive: true,
      },
    ];

    for (const roleData of seedRoles) {
      const { recordId, permissions, ...rest } = roleData;
      await roleModel.findOneAndUpdate(
        { recordId },
        { ...rest, $addToSet: { permissions: { $each: permissions } } },
        { upsert: true, new: true }
      );
    }
    console.log('Verified System Roles.');

    // --- Admin User ---
    const adminRole = await roleModel.findOne({ recordId: 'ROLE_ADMINISTRATOR' });
    const adminEmail = configService.get<string>('ADMIN_EMAIL');
    if (adminEmail && adminRole) {
      const hash = await bcrypt.hash('pw', 10);
      await userModel.findOneAndUpdate(
        { email: adminEmail },
        {
          $setOnInsert: {
            recordId: 'USR0001',
            firstName: configService.get('ADMIN_FIRST_NAME'),
            lastName: configService.get('ADMIN_LAST_NAME'),
            name: 'System Administrator',
            email: adminEmail,
            password: hash,
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id,
            isActive: true,
          }
        },
        { upsert: true }
      );
      console.log('Verified System Admin.');
    }

    // ---------------------------------------------------------
    // 2. DEVELOPMENT DATA (Only runs if APP_ENV=local)
    // ---------------------------------------------------------
    if (configService.get('APP_ENV') === 'local') {
      console.log('------------------------------------------------');
      console.log('APP_ENV is "local". Seeding extra development data...');
      console.log('------------------------------------------------');

      const consultantRole = await roleModel.findOne({ recordId: 'ROLE_CONSULTANT' });
      const growerRole = await roleModel.findOne({ recordId: 'ROLE_GROWER' });
      const commonPassword = await bcrypt.hash('password123', 10);

      // --- A. Create Subsidiary ---
      const devSub = await subsidiaryModel.findOneAndUpdate(
        { name: 'Dev Subsidiary' },
        {
          $setOnInsert: { recordId: 'SUB-DEV-001', name: 'Dev Subsidiary', isActive: true, isDeleted: false }
        },
        { upsert: true, new: true }
      );

      // --- B. Create Clients (Linked to Sub) ---
      const clientA = await clientModel.findOneAndUpdate(
        { name: 'Dev Client A (Sub)' },
        {
          $setOnInsert: { recordId: 'CLI-DEV-001', isActive: true, isDeleted: false },
          subsidiaryId: devSub._id
        },
        { upsert: true, new: true }
      );

      const clientB = await clientModel.findOneAndUpdate(
        { name: 'Dev Client B (Sub)' },
        {
          $setOnInsert: { recordId: 'CLI-DEV-002', isActive: true, isDeleted: false },
          subsidiaryId: devSub._id
        },
        { upsert: true, new: true }
      );

      // --- C. Create Standalone Client ---
      const clientStandalone = await clientModel.findOneAndUpdate(
        { name: 'Dev Client Standalone' },
        {
          $setOnInsert: { recordId: 'CLI-DEV-003', isActive: true, isDeleted: false },
          $unset: { subsidiaryId: "" }
        },
        { upsert: true, new: true }
      );

      // --- D. Helper: Create Users (Updated to return User) ---
      const seedDevUser = async (email: string, fName: string, lName: string, roleId: any, clientId: any, type: UserType = UserType.EMPLOYEE) => {
        const typePrefix = type === UserType.EMPLOYEE ? 'EMP' : 'CON';
        const uniqueRecordId = `USR-DEV-${fName}-${lName}-${typePrefix}`; 

        // Return the document so we can use its _id
        return userModel.findOneAndUpdate(
            { email },
            {
                $setOnInsert: {
                    recordId: uniqueRecordId, 
                    firstName: fName,
                    lastName: lName,
                    name: `${fName} ${lName}`,
                    password: commonPassword,
                    userType: type,
                    isActive: true,
                    isDeleted: false
                },
                roleId: roleId,
                clientIds: [clientId] 
            },
            { upsert: true, new: true }
        );
      };

      // --- Users for Client A ---
      await seedDevUser('consultant.a@dev.com', 'Consultant', 'A', consultantRole._id, clientA._id, UserType.EMPLOYEE);
      await seedDevUser('grower.a@dev.com', 'Grower', 'A', growerRole._id, clientA._id, UserType.CONTACT); 
      const foremanA = await seedDevUser('foreman.a@dev.com', 'Foreman', 'A', growerRole._id, clientA._id, UserType.CONTACT);


      // --- Users for Client B ---
      await seedDevUser('consultant.b@dev.com', 'Consultant', 'B', consultantRole._id, clientB._id, UserType.EMPLOYEE);
      await seedDevUser('grower.b@dev.com', 'Grower', 'B', growerRole._id, clientB._id, UserType.CONTACT);
      const foremanB = await seedDevUser('foreman.b@dev.com', 'Foreman', 'B', growerRole._id, clientB._id, UserType.CONTACT);


      // --- Users for Standalone ---
      await seedDevUser('consultant.sa@dev.com', 'Consultant', 'SA', consultantRole._id, clientStandalone._id, UserType.EMPLOYEE);
      await seedDevUser('grower.sa@dev.com', 'Grower', 'SA', growerRole._id, clientStandalone._id, UserType.CONTACT);
      const foremanSA = await seedDevUser('foreman.sa@dev.com', 'Foreman', 'SA', growerRole._id, clientStandalone._id, UserType.CONTACT);


      // --- E. Helper: Create Orchards (Updated for user assignment) ---
      const seedDevOrchard = async (name: string, recordId: string, clientId: any, assignedUserIds: any[] = []) => {
          await orchardModel.findOneAndUpdate(
              { recordId },
              {
                  $setOnInsert: {
                      name: name,
                      recordId: recordId,
                      clientId: clientId,
                      isActive: true,
                      isDeleted: false
                  },
                  // We update userIds even on existing records to ensure the foreman is assigned during dev iterations
                  $addToSet: { userIds: { $each: assignedUserIds } } 
              },
              { upsert: true, new: true }
          );
      };

      // Create Orchards with the Foreman assigned
      await seedDevOrchard('Orchard A-1', 'ORC-DEV-001', clientA._id, [foremanA._id]);
      await seedDevOrchard('Orchard B-1', 'ORC-DEV-002', clientB._id, [foremanB._id]);
      await seedDevOrchard('Orchard SA-1', 'ORC-DEV-003', clientStandalone._id, [foremanSA._id]);

      console.log('Development data (Subsidiaries, Clients, Users [Contact], Orchards) seeded successfully.');
    }

    console.log('Database seeding process finished.');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();