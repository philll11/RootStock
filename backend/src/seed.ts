import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Role, VisibilityScope } from './roles/schemas/role.schema';
import { getModelToken } from '@nestjs/mongoose';
import { PERMISSIONS } from './common/constants/permissions.constants';
import { Counter } from './counters/schemas/counter.schema';

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
  // Bootstrap the NestJS application context, which allows us to use the DI container.
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('Starting database seeding process...');

    // Get the Mongoose Model for the Role schema through the DI container.
    const roleModel = app.get(getModelToken(Role.name));
    const counterModel = app.get(getModelToken(Counter.name));

    // --- Define and Seed the Essential Counters ---
    // This array defines the initial state for our recordId counters.
    const seedCounters = [
      { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 },
      { _id: 'client', prefix: 'CLI', sequence_value: 0 },
      { _id: 'user', prefix: 'USR', sequence_value: 0 },
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
    // This array holds the definitions for the roles that are critical for
    // the application's initial setup.
    const seedRoles = [
      {
        // The highest-level administrator role. Has all permissions and can see all data.
        recordId: 'ROLE_ADMINISTRATOR',
        name: 'Administrator',
        description: 'Super administrator with access to all system features and data.',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: Object.values(PERMISSIONS), // Grants every permission defined in the system.
        isActive: true,
      },
      {
        // A standard role for a consultant who manages multiple clients within a firm.
        recordId: 'ROLE_CONSULTANT',
        name: 'Consultant',
        description: 'Consultant role with access to clients within their subsidiary.',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          // Add other permissions a consultant might need by default.
        ],
        isActive: true,
      },
      {
        // A standard role for a client user (e.g., a grower).
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

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('An error occurred during database seeding:', error);
    throw error;
  } finally {
    // Ensure the application context is closed to allow the script to exit.
    await app.close();
  }
}

// Execute the bootstrap function.
bootstrap();
