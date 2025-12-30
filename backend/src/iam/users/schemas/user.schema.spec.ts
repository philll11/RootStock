// backend/src/users/schemas/user.schema.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User, UserSchema, UserDocument, UserType } from './user.schema';

describe('User Schema - RootStock Multi-Tenant System', () => {
  let moduleRef: TestingModule;
  let userModel: Model<UserDocument>;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
    }).compile();

    userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongoServer?.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  describe('RootStock Agricultural User Types', () => {
    it('should create employee user for multi-client agricultural consulting', async () => {
      // Arrange: Agricultural consultant managing multiple client orchards
      const consultantUser = new userModel({
        recordId: 'USR0001',
        firstName: 'Sarah',
        lastName: 'Chen',
        name: 'Sarah Chen',
        userType: UserType.EMPLOYEE,
        clientIds: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()],
        roleId: new Types.ObjectId(),
        isActive: true,
        isDeleted: false,
      });

      // Act: Save consultant employee user
      const savedUser = await consultantUser.save();

      // Assert: Employee user configured for multi-client access
      expect(savedUser.userType).toBe(UserType.EMPLOYEE);
      expect(savedUser.clientIds).toHaveLength(3); // Multiple clients allowed
      expect(savedUser.firstName).toBe('Sarah');
      expect(savedUser.lastName).toBe('Chen');
      expect(savedUser.name).toBe('Sarah Chen'); // Server-derived field
      expect(savedUser.roleId).toBeDefined();
    });

    it('should create contact user for single orchard farm management', async () => {
      // Arrange: Farm owner managing their own orchard operation
      const orchardOwner = new userModel({
        recordId: 'USR0002',
        firstName: 'Michael',
        lastName: 'Thompson',
        name: 'Michael Thompson',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()], // Single client only
        roleId: new Types.ObjectId(),
        isActive: true,
      });

      // Act: Save contact user for single orchard
      const savedUser = await orchardOwner.save();

      // Assert: Contact user limited to single client access
      expect(savedUser.userType).toBe(UserType.CONTACT);
      expect(savedUser.clientIds).toHaveLength(1); // Single client constraint
      expect(savedUser.name).toBe('Michael Thompson');
      expect(savedUser.isDeleted).toBe(false); // Default value
    });

    it('should create agricultural advisor employee with no initial client assignments', async () => {
      // Arrange: New agricultural advisor awaiting client assignments
      const newAdvisor = new userModel({
        recordId: 'USR0003',
        firstName: 'Elena',
        lastName: 'Rodriguez',
        name: 'Elena Rodriguez',
        userType: UserType.EMPLOYEE,
        clientIds: [], // No initial assignments
        isActive: true,
      });

      // Act: Save employee without role or client assignments
      const savedUser = await newAdvisor.save();

      // Assert: Employee ready for future assignments
      expect(savedUser.userType).toBe(UserType.EMPLOYEE);
      expect(savedUser.clientIds).toHaveLength(0);
      expect(savedUser.roleId).toBeUndefined(); // Optional until assignment
      expect(savedUser.isActive).toBe(true);
    });

    it('should create field manager contact for specialized orchard operations', async () => {
      // Arrange: Field manager responsible for specific orchard blocks
      const fieldManager = new userModel({
        recordId: 'USR0004',
        firstName: 'David',
        lastName: 'Kim',
        name: 'David Kim',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()],
        roleId: new Types.ObjectId(),
      });

      // Act: Save field manager contact
      const savedUser = await fieldManager.save();

      // Assert: Contact configured with business defaults
      expect(savedUser.userType).toBe(UserType.CONTACT);
      expect(savedUser.isActive).toBe(true); // Default active
      expect(savedUser.isDeleted).toBe(false); // Default not deleted
      expect(savedUser.name).toBe('David Kim');
    });
  });

  describe('Multi-Tenant User Access Patterns', () => {
    it('should support consultant employee managing diverse agricultural clients', async () => {
      // Arrange: Senior consultant with multiple specialized client types
      const orchardClient = new Types.ObjectId();
      const vineyardClient = new Types.ObjectId();
      const organicFarmClient = new Types.ObjectId();
      const consultingRoleId = new Types.ObjectId();

      const seniorConsultant = new userModel({
        recordId: 'USR0005',
        firstName: 'Jennifer',
        lastName: 'Martinez',
        name: 'Jennifer Martinez',
        userType: UserType.EMPLOYEE,
        clientIds: [orchardClient, vineyardClient, organicFarmClient],
        roleId: consultingRoleId,
        isActive: true,
      });

      // Act: Save multi-client consultant
      const savedUser = await seniorConsultant.save();

      // Assert: Employee configured for diverse client portfolio
      expect(savedUser.clientIds.map(id => id.toString())).toContain(orchardClient.toString());
      expect(savedUser.clientIds.map(id => id.toString())).toContain(vineyardClient.toString());
      expect(savedUser.clientIds.map(id => id.toString())).toContain(organicFarmClient.toString());
      expect(savedUser.roleId).toEqual(consultingRoleId);
    });

    it('should support regional employee managing subsidiary client network', async () => {
      // Arrange: Regional manager overseeing subsidiary client operations
      const subsidiaryClients = [
        new Types.ObjectId(), // North Valley Orchards
        new Types.ObjectId(), // South Ridge Farms
        new Types.ObjectId(), // Mountain View Growers
        new Types.ObjectId(), // Coastal Agricultural Co-op
      ];

      const regionalManager = new userModel({
        recordId: 'USR0006',
        firstName: 'Robert',
        lastName: 'Johnson',
        name: 'Robert Johnson',
        userType: UserType.EMPLOYEE,
        clientIds: subsidiaryClients,
        roleId: new Types.ObjectId(),
      });

      // Act: Save regional manager with subsidiary client network
      const savedUser = await regionalManager.save();

      // Assert: Employee managing regional client network
      expect(savedUser.clientIds).toHaveLength(4);
      expect(savedUser.userType).toBe(UserType.EMPLOYEE);
      subsidiaryClients.forEach(clientId => {
        expect(savedUser.clientIds.map(id => id.toString())).toContain(clientId.toString());
      });
    });

    it('should support family farm contact users across different orchard types', async () => {
      // Arrange: Different contact users for specialized orchard operations
      const appleOrchardClient = new Types.ObjectId();
      const cherryOrchardClient = new Types.ObjectId();
      const organicOrchardClient = new Types.ObjectId();

      const contactUsers = [
        {
          recordId: 'USR0007',
          firstName: 'Maria',
          lastName: 'Gonzalez',
          name: 'Maria Gonzalez',
          userType: UserType.CONTACT,
          clientIds: [appleOrchardClient],
        },
        {
          recordId: 'USR0008', 
          firstName: 'James',
          lastName: 'Wilson',
          name: 'James Wilson',
          userType: UserType.CONTACT,
          clientIds: [cherryOrchardClient],
        },
        {
          recordId: 'USR0009',
          firstName: 'Lisa',
          lastName: 'Anderson',
          name: 'Lisa Anderson',
          userType: UserType.CONTACT,
          clientIds: [organicOrchardClient],
        },
      ];

      // Act: Create specialized contact users
      const savedUsers = await userModel.insertMany(contactUsers);

      // Assert: Each contact user limited to single client specialization
      savedUsers.forEach(user => {
        expect(user.userType).toBe(UserType.CONTACT);
        expect(user.clientIds).toHaveLength(1);
        expect(user.isActive).toBe(true);
      });
    });

    it('should support enterprise employee user portfolio management', async () => {
      // Arrange: Enterprise employee managing large client portfolio
      const enterpriseClients = Array.from({ length: 10 }, () => new Types.ObjectId());
      const enterpriseRole = new Types.ObjectId();

      const enterpriseManager = new userModel({
        recordId: 'USR0010',
        firstName: 'Amanda',
        lastName: 'Foster',
        name: 'Amanda Foster',
        userType: UserType.EMPLOYEE,
        clientIds: enterpriseClients,
        roleId: enterpriseRole,
      });

      // Act: Save enterprise portfolio manager
      const savedUser = await enterpriseManager.save();

      // Assert: Employee configured for enterprise client management
      expect(savedUser.clientIds).toHaveLength(10);
      expect(savedUser.userType).toBe(UserType.EMPLOYEE);
      expect(savedUser.roleId).toEqual(enterpriseRole);
    });
  });

  describe('RootStock Entity State Management', () => {
    it('should default to active and not-deleted for new agricultural users', async () => {
      // Arrange: New user without explicit status settings
      const newGrower = new userModel({
        recordId: 'USR0011',
        firstName: 'Thomas',
        lastName: 'Brown',
        name: 'Thomas Brown',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()],
      });

      // Act: Save new user with default status
      const savedUser = await newGrower.save();

      // Assert: Defaults to active agricultural user state
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.isDeleted).toBe(false);
      expect((savedUser as any).createdAt).toBeDefined(); // Timestamps enabled
      expect((savedUser as any).updatedAt).toBeDefined();
    });

    it('should support user deactivation for seasonal agricultural operations', async () => {
      // Arrange: Active seasonal worker during harvest
      const seasonalWorker = new userModel({
        recordId: 'USR0012',
        firstName: 'Carlos',
        lastName: 'Ramirez',
        name: 'Carlos Ramirez',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()],
        isActive: true,
      });
      await seasonalWorker.save();

      // Act: Deactivate user for off-season (business workflow)
      const deactivatedUser = await userModel.findByIdAndUpdate(
        seasonalWorker._id,
        { isActive: false },
        { new: true }
      );

      // Assert: User deactivated while preserving access for next season
      expect(deactivatedUser?.isActive).toBe(false);
      expect(deactivatedUser?.isDeleted).toBe(false); // Still accessible for reporting
    });

    it('should support soft deletion for user lifecycle management', async () => {
      // Arrange: User leaving agricultural operations but needs historical preservation
      const departingEmployee = new userModel({
        recordId: 'USR0013',
        firstName: 'Patricia',
        lastName: 'Davis',
        name: 'Patricia Davis',
        userType: UserType.EMPLOYEE,
        clientIds: [new Types.ObjectId(), new Types.ObjectId()],
        roleId: new Types.ObjectId(),
        isActive: true,
      });
      await departingEmployee.save();

      // Act: Soft delete user (UsersService pattern)
      const deletedUser = await userModel.findByIdAndUpdate(
        departingEmployee._id,
        { isDeleted: true, isActive: false },
        { new: true }
      );

      // Assert: User soft-deleted with preserved historical data
      expect(deletedUser?.isDeleted).toBe(true);
      expect(deletedUser?.isActive).toBe(false);
      expect(deletedUser?.name).toBe('Patricia Davis'); // Data preserved
    });

    it('should support user reactivation for returning agricultural professionals', async () => {
      // Arrange: Previously inactive user returning to agricultural operations
      const returningConsultant = new userModel({
        recordId: 'USR0014',
        firstName: 'Kevin',
        lastName: 'Taylor',
        name: 'Kevin Taylor',
        userType: UserType.EMPLOYEE,
        clientIds: [new Types.ObjectId()],
        roleId: new Types.ObjectId(),
        isActive: false, // Previously inactive
      });
      await returningConsultant.save();

      // Act: Reactivate user for new agricultural season
      const reactivatedUser = await userModel.findByIdAndUpdate(
        returningConsultant._id,
        { isActive: true },
        { new: true }
      );

      // Assert: User reactivated for agricultural operations
      expect(reactivatedUser?.isActive).toBe(true);
      expect(reactivatedUser?.isDeleted).toBe(false);
    });

    it('should support role assignment changes for career advancement', async () => {
      // Arrange: User starting with basic role
      const growingEmployee = new userModel({
        recordId: 'USR0015',
        firstName: 'Michelle',
        lastName: 'Garcia',
        name: 'Michelle Garcia',
        userType: UserType.EMPLOYEE,
        clientIds: [new Types.ObjectId()],
        roleId: new Types.ObjectId(), // Junior role
      });
      await growingEmployee.save();

      // Act: Promote user to senior role with expanded access
      const newRoleId = new Types.ObjectId();
      const promotedUser = await userModel.findByIdAndUpdate(
        growingEmployee._id,
        { 
          roleId: newRoleId,
          clientIds: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()]
        },
        { new: true }
      );

      // Assert: User promoted with expanded client access
      expect(promotedUser?.roleId).toEqual(newRoleId);
      expect(promotedUser?.clientIds).toHaveLength(3);
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce unique recordId constraint for business identification', async () => {
      // Arrange: Create user with specific recordId
      const firstUser = new userModel({
        recordId: 'USR_UNIQUE',
        firstName: 'First',
        lastName: 'User',
        name: 'First User',
        userType: UserType.EMPLOYEE,
      });
      await firstUser.save();

      // Act & Assert: Attempt to create another user with same recordId should fail
      const duplicateUser = new userModel({
        recordId: 'USR_UNIQUE', // Same business ID
        firstName: 'Second',
        lastName: 'User',
        name: 'Second User',
        userType: UserType.CONTACT,
      });

      await expect(duplicateUser.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should require all essential business fields for agricultural users', async () => {
      // Arrange: User missing required business fields
      const incompleteUser = new userModel({
        // Missing recordId, firstName, lastName, name, and userType
        isActive: true,
      });

      // Act & Assert: Should fail validation for missing required fields
      await expect(incompleteUser.save()).rejects.toThrow(/validation failed/);
    });

    it('should reject empty business identifiers and names', async () => {
      // Arrange: User with empty required fields
      const emptyFieldsUser = new userModel({
        recordId: '', // Empty recordId
        firstName: '', // Empty firstName
        lastName: '', // Empty lastName
        name: '', // Empty name
        userType: UserType.EMPLOYEE,
      });

      // Act & Assert: Should fail validation for empty required fields
      await expect(emptyFieldsUser.save()).rejects.toThrow();
    });

    it('should validate UserType enum constraint for agricultural roles', async () => {
      // Arrange: User with invalid userType
      const invalidUserType = new userModel({
        recordId: 'USR0016',
        firstName: 'Invalid',
        lastName: 'Type',
        name: 'Invalid Type',
        userType: 'invalid-type' as any, // Invalid enum value
      });

      // Act & Assert: Should fail userType enum validation
      await expect(invalidUserType.save()).rejects.toThrow();
    });

    it('should validate roleId ObjectId format for relationship integrity', async () => {
      // Arrange: User with invalid roleId ObjectId
      const invalidRoleUser = new userModel({
        recordId: 'USR0017',
        firstName: 'Invalid',
        lastName: 'Role',
        name: 'Invalid Role',
        userType: UserType.EMPLOYEE,
        roleId: 'invalid-objectid-format' as any,
      });

      // Act & Assert: Should fail ObjectId validation
      await expect(invalidRoleUser.save()).rejects.toThrow();
    });

    it('should validate clientIds array contains valid ObjectId formats', async () => {
      // Arrange: User with invalid ObjectId in clientIds array
      const invalidClientIdsUser = new userModel({
        recordId: 'USR0018',
        firstName: 'Invalid',
        lastName: 'Clients',
        name: 'Invalid Clients',
        userType: UserType.EMPLOYEE,
        clientIds: ['invalid-objectid', new Types.ObjectId()] as any,
      });

      // Act & Assert: Should fail ObjectId array validation
      await expect(invalidClientIdsUser.save()).rejects.toThrow();
    });

    it('should enforce required name field for business operations', async () => {
      // Arrange: User missing name field (server-derived field)
      const missingNameUser = new userModel({
        recordId: 'USR0019',
        firstName: 'Missing',
        lastName: 'Name',
        // Missing name field - should be server-derived
        userType: UserType.CONTACT,
      });

      // Act & Assert: Should fail validation for missing name field
      await expect(missingNameUser.save()).rejects.toThrow();
    });
  });

  describe('RootStock Integration Scenarios', () => {
    it('should support user business evolution and role changes', async () => {
      // Arrange: Start with contact user for single orchard
      const evolvingUser = new userModel({
        recordId: 'USR0020',
        firstName: 'Emma',
        lastName: 'Clark',
        name: 'Emma Clark',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()], // Single orchard
      });
      await evolvingUser.save();

      // Act: User evolves to employee consultant role with multiple clients
      const evolvedUser = await userModel.findByIdAndUpdate(
        evolvingUser._id,
        {
          userType: UserType.EMPLOYEE, // Now consultant
          clientIds: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()],
          roleId: new Types.ObjectId(), // Assigned consultant role
        },
        { new: true }
      );

      // Assert: User evolved to support business growth
      expect(evolvedUser?.userType).toBe(UserType.EMPLOYEE);
      expect(evolvedUser?.clientIds).toHaveLength(3);
      expect(evolvedUser?.roleId).toBeDefined();
    });

    it('should maintain referential integrity with recordId for orchard assignments', async () => {
      // Arrange: User that will be referenced by orchards and assessments
      const referencedUser = new userModel({
        recordId: 'USR0021',
        firstName: 'Daniel',
        lastName: 'White',
        name: 'Daniel White',
        userType: UserType.CONTACT,
        clientIds: [new Types.ObjectId()],
        roleId: new Types.ObjectId(),
        isActive: true,
      });

      // Act: Save user for entity references
      const savedUser = await referencedUser.save();

      // Assert: User has stable IDs for relationships
      expect(savedUser._id).toBeDefined();
      expect(savedUser.recordId).toBe('USR0021'); // Business key for display
      expect(typeof savedUser._id.toString()).toBe('string'); // MongoDB ObjectId for relations
    });

    it('should support international user names for global agricultural operations', async () => {
      // Arrange: International users for global RootStock deployment
      const internationalUsers = [
        { 
          recordId: 'USR0022', 
          firstName: 'François', 
          lastName: 'Dubois', 
          name: 'François Dubois',
          userType: UserType.EMPLOYEE 
        }, // French
        { 
          recordId: 'USR0023', 
          firstName: 'Müller', 
          lastName: 'Schmidt', 
          name: 'Müller Schmidt',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()]
        }, // German
        { 
          recordId: 'USR0024', 
          firstName: 'José', 
          lastName: 'García', 
          name: 'José García',
          userType: UserType.EMPLOYEE 
        }, // Spanish
        { 
          recordId: 'USR0025', 
          firstName: 'João', 
          lastName: 'Silva', 
          name: 'João Silva',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()]
        }, // Portuguese
      ];

      // Act: Create international users
      const savedUsers = await userModel.insertMany(internationalUsers);

      // Assert: International characters preserved for global business
      expect(savedUsers[0].name).toBe('François Dubois');
      expect(savedUsers[1].name).toBe('Müller Schmidt');
      expect(savedUsers[2].name).toBe('José García');
      expect(savedUsers[3].name).toBe('João Silva');
    });

    it('should support bulk user operations for enterprise client onboarding', async () => {
      // Arrange: Enterprise scenario - onboarding multiple users simultaneously
      const enterpriseClientId = new Types.ObjectId();
      const consultingRoleId = new Types.ObjectId();
      const bulkUsers = Array.from({ length: 5 }, (_, i) => ({
        recordId: `USR_BULK_${i.toString().padStart(3, '0')}`,
        firstName: `Enterprise`,
        lastName: `User${i + 1}`,
        name: `Enterprise User${i + 1}`,
        userType: UserType.EMPLOYEE,
        clientIds: [enterpriseClientId],
        roleId: consultingRoleId,
        isActive: true,
      }));

      // Act: Bulk create users for enterprise onboarding
      const onboardedUsers = await userModel.insertMany(bulkUsers);

      // Assert: Bulk operations support enterprise user management
      expect(onboardedUsers).toHaveLength(5);
      onboardedUsers.forEach((user, index) => {
        expect(user.recordId).toBe(`USR_BULK_${index.toString().padStart(3, '0')}`);
        expect(user.clientIds.map(id => id.toString())).toContain(enterpriseClientId.toString());
        expect(user.roleId).toEqual(consultingRoleId);
        expect(user.isActive).toBe(true);
      });
    });

    it('should support mixed user type scenarios for agricultural consulting businesses', async () => {
      // Arrange: Consulting business with mixed employee and contact users
      const consultingClientId = new Types.ObjectId();
      const farmClientId = new Types.ObjectId();
      
      const mixedUsers = [
        {
          recordId: 'USR0026',
          firstName: 'Senior',
          lastName: 'Consultant',
          name: 'Senior Consultant',
          userType: UserType.EMPLOYEE,
          clientIds: [consultingClientId, farmClientId], // Multiple clients
          roleId: new Types.ObjectId(),
        },
        {
          recordId: 'USR0027',
          firstName: 'Farm',
          lastName: 'Owner',
          name: 'Farm Owner',
          userType: UserType.CONTACT,
          clientIds: [farmClientId], // Single client only
          roleId: new Types.ObjectId(),
        },
        {
          recordId: 'USR0028',
          firstName: 'Field',
          lastName: 'Manager',
          name: 'Field Manager',
          userType: UserType.CONTACT,
          clientIds: [farmClientId], // Same farm, different role
          roleId: new Types.ObjectId(),
        },
      ];

      // Act: Create mixed user types for consulting scenario
      const savedUsers = await userModel.insertMany(mixedUsers);

      // Assert: Mixed user types support diverse business models
      expect(savedUsers[0].userType).toBe(UserType.EMPLOYEE);
      expect(savedUsers[0].clientIds).toHaveLength(2); // Employee: multiple clients
      expect(savedUsers[1].userType).toBe(UserType.CONTACT);
      expect(savedUsers[1].clientIds).toHaveLength(1); // Contact: single client
      expect(savedUsers[2].userType).toBe(UserType.CONTACT);
      expect(savedUsers[2].clientIds).toHaveLength(1); // Contact: single client
    });
  });

  describe('Database Query Performance and Integration', () => {
    it('should support efficient client-based user queries for business operations', async () => {
      // Arrange: Multiple clients with their respective users
      const orchardClientA = new Types.ObjectId();
      const orchardClientB = new Types.ObjectId();
      
      await userModel.insertMany([
        { 
          recordId: 'USR0029', 
          firstName: 'Client A', 
          lastName: 'Employee', 
          name: 'Client A Employee',
          userType: UserType.EMPLOYEE,
          clientIds: [orchardClientA], 
          isActive: true 
        },
        { 
          recordId: 'USR0030', 
          firstName: 'Client A', 
          lastName: 'Contact', 
          name: 'Client A Contact',
          userType: UserType.CONTACT,
          clientIds: [orchardClientA], 
          isActive: true 
        },
        { 
          recordId: 'USR0031', 
          firstName: 'Client B', 
          lastName: 'Contact', 
          name: 'Client B Contact',
          userType: UserType.CONTACT,
          clientIds: [orchardClientB], 
          isActive: true 
        },
        { 
          recordId: 'USR0032', 
          firstName: 'Multi Client', 
          lastName: 'Employee', 
          name: 'Multi Client Employee',
          userType: UserType.EMPLOYEE,
          clientIds: [orchardClientA, orchardClientB], 
          isActive: true 
        },
      ]);

      // Act: Query users for specific client (typical UsersService pattern)
      const clientAUsers = await userModel.find({
        clientIds: { $in: [orchardClientA] },
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns users associated with specific client
      expect(clientAUsers).toHaveLength(3); // Two single-client + one multi-client
      clientAUsers.forEach(user => {
        expect(user.clientIds.map(id => id.toString())).toContain(orchardClientA.toString());
      });
    });

    it('should support the UsersService query patterns for multi-tenant access', async () => {
      // Arrange: Set up test users as UsersService would query them
      await userModel.create([
        {
          recordId: 'USR0033',
          firstName: 'Query Test',
          lastName: 'Active',
          name: 'Query Test Active',
          userType: UserType.EMPLOYEE,
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'USR0034',
          firstName: 'Query Test',
          lastName: 'Inactive',
          name: 'Query Test Inactive',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: false, // Inactive
          isDeleted: false,
        },
        {
          recordId: 'USR0035',
          firstName: 'Query Test',
          lastName: 'Deleted',
          name: 'Query Test Deleted',
          userType: UserType.EMPLOYEE,
          isActive: false,
          isDeleted: true, // Soft deleted
        },
      ]);

      // Act: Query active users (typical UsersService pattern)
      const activeUsers = await userModel.find({
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns only active, non-deleted users
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].name).toBe('Query Test Active');
      expect(activeUsers[0].isActive).toBe(true);
      expect(activeUsers[0].isDeleted).toBe(false);
    });

    it('should support userType-based queries for role management', async () => {
      // Arrange: Create users of different types
      const clientId = new Types.ObjectId();
      await userModel.insertMany([
        {
          recordId: 'USR0036',
          firstName: 'Employee',
          lastName: 'One',
          name: 'Employee One',
          userType: UserType.EMPLOYEE,
          clientIds: [clientId],
          isActive: true,
        },
        {
          recordId: 'USR0037',
          firstName: 'Employee',
          lastName: 'Two',
          name: 'Employee Two',
          userType: UserType.EMPLOYEE,
          clientIds: [clientId],
          isActive: true,
        },
        {
          recordId: 'USR0038',
          firstName: 'Contact',
          lastName: 'One',
          name: 'Contact One',
          userType: UserType.CONTACT,
          clientIds: [clientId],
          isActive: true,
        },
      ]);

      // Act: Query employees only
      const employees = await userModel.find({
        userType: UserType.EMPLOYEE,
        isActive: true,
        isDeleted: false,
      }).exec();

      // Assert: Query returns only employee users
      expect(employees).toHaveLength(2);
      employees.forEach(user => {
        expect(user.userType).toBe(UserType.EMPLOYEE);
      });
    });

    it('should maintain proper MongoDB collection structure for UsersService integration', () => {
      // Assert: Verify schema structure matches service expectations
      expect(userModel.collection.name).toBe('users');
      
      const paths = userModel.schema.paths;
      expect(paths).toHaveProperty('recordId');      // Business identifier
      expect(paths).toHaveProperty('name');          // Server-derived full name
      expect(paths).toHaveProperty('firstName');     // User first name
      expect(paths).toHaveProperty('lastName');      // User last name
      expect(paths).toHaveProperty('userType');      // Employee vs Contact
      expect(paths).toHaveProperty('roleId');        // Role relationship (optional)
      expect(paths).toHaveProperty('clientIds');     // Client access array
      expect(paths).toHaveProperty('isActive');      // Business state
      expect(paths).toHaveProperty('isDeleted');     // Soft delete state
      expect(paths).toHaveProperty('createdAt');     // Audit trail (from timestamps: true)
      expect(paths).toHaveProperty('updatedAt');     // Audit trail (from timestamps: true)
    });

    it('should support efficient role-based user queries for access control', async () => {
      // Arrange: Users with different roles for access control testing
      const adminRoleId = new Types.ObjectId();
      const managerRoleId = new Types.ObjectId();
      const growerRoleId = new Types.ObjectId();

      await userModel.insertMany([
        {
          recordId: 'USR0039',
          firstName: 'System',
          lastName: 'Admin',
          name: 'System Admin',
          userType: UserType.EMPLOYEE,
          roleId: adminRoleId,
          isActive: true,
        },
        {
          recordId: 'USR0040',
          firstName: 'Orchard',
          lastName: 'Manager',
          name: 'Orchard Manager',
          userType: UserType.EMPLOYEE,
          roleId: managerRoleId,
          isActive: true,
        },
        {
          recordId: 'USR0041',
          firstName: 'Farm',
          lastName: 'Grower',
          name: 'Farm Grower',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          roleId: growerRoleId,
          isActive: true,
        },
      ]);

      // Act: Query users by specific role
      const adminUsers = await userModel.find({
        roleId: adminRoleId,
        isActive: true,
        isDeleted: false,
      }).exec();

      // Assert: Query returns users with specific role
      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].roleId).toEqual(adminRoleId);
      expect(adminUsers[0].name).toBe('System Admin');
    });
  });
});
