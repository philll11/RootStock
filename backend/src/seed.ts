// backend/src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Role, VisibilityScope } from './roles/schemas/role.schema';
import { getModelToken } from '@nestjs/mongoose';
import { PERMISSIONS } from './common/constants/permissions.constants';
import { Counter } from './counters/schemas/counter.schema';
import { User, UserType } from './users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * A standalone NestJS application script for seeding the database.
 *
 * This script connects to the database and inserts a set of essential, default
 * Role documents that are required for the application to function correctly.
 * It is designed to be idempotent, meaning it can be run multiple times without
 * creating duplicate data or causing errors.
 *
 * To run this script, use the command: `npm run seed`
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);

  try {
    console.log('Starting database seeding process...');

    const roleModel = app.get(getModelToken(Role.name));
    const counterModel = app.get(getModelToken(Counter.name));
    const userModel = app.get(getModelToken(User.name));

    // --- Define and Seed the Essential Counters ---
    // This array defines the initial state for our recordId counters.
    const seedCounters = [
      { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 },
      { _id: 'client', prefix: 'CLI', sequence_value: 0 },
      { _id: 'user', prefix: 'USR', sequence_value: 1 }, // Start from 1 for user to reserve USR000001 for admin
      { _id: 'role', prefix: 'ROL', sequence_value: 0 },
      { _id: 'orchard', prefix: 'ORC', sequence_value: 0 },
    ];

    for (const counterData of seedCounters) {
      await counterModel.findOneAndUpdate(
        { _id: counterData._id },
        { $setOnInsert: counterData },
        { upsert: true, new: true },
      );
      console.log(`Successfully seeded/verified counter: ${counterData._id}`);
    }


    // --- Define the Essential Roles ---
    const seedRoles = [
      {
        recordId: 'ROLE_ADMINISTRATOR',
        name: 'Administrator',
        description: 'Super administrator with access to all system features and data.',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: Object.values(PERMISSIONS),
        isActive: true,
      },
      {
        recordId: 'ROLE_CONSULTANT',
        name: 'Consultant',
        description: 'Consultant role with access to clients within their subsidiary.',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.VARIETY_VIEW,
        ],
        isActive: true,
      },
      {
        recordId: 'ROLE_GROWER',
        name: 'Grower',
        description: 'Standard client user with access to their own client data.',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
        ],
        isActive: true,
      },
    ];

    // --- Seeding Logic ---
    // Iterate over each role definition and use `findOneAndUpdate` with `upsert: true`.
    // This makes the script idempotent:
    // - If a role with the `recordId` exists, it will be updated with the latest permissions.
    // - If it does not exist, it will be created.
    for (const roleData of seedRoles) {
      const { recordId, permissions, ...restOfRoleData } = roleData;
      const result = await roleModel.findOneAndUpdate(
        { recordId },
        { ...restOfRoleData, $addToSet: { permissions: { $each: permissions } } },
        { upsert: true, new: true }
      );
      console.log(`Successfully seeded/updated role: ${result.name}`);
    }

    // --- Create an Initial Administrator User ---
    const adminRole = await roleModel.findOne({ recordId: 'ROLE_ADMINISTRATOR' }).exec();
    if (!adminRole) {
      throw new Error('Could not find Administrator role to assign to the admin user.');
    }

    // Get admin details from environment variables
    const adminEmail = configService.get<string>('ADMIN_EMAIL');
    const adminFirstName = configService.get<string>('ADMIN_FIRST_NAME');
    const adminLastName = configService.get<string>('ADMIN_LAST_NAME');

    if (!adminEmail) {
      console.warn('Skipping admin user seed because ADMIN_EMAIL is not set in .env file.');
    } else {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await userModel.findOneAndUpdate(
        { email: adminEmail },
        {
          $setOnInsert: {
            recordId: 'USR0001', // Manually set recordId for admin user
            firstName: adminFirstName,
            lastName: adminLastName,
            name: `${adminFirstName} ${adminLastName}`,
            email: adminEmail,
            password: hashedPassword,
            userType: UserType.EMPLOYEE,
            roleId: adminRole._id,
            clientIds: [],
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true },
      );
      console.log(`Successfully seeded/verified administrator user: ${adminEmail}`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('An error occurred during database seeding:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
