import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Role, RoleSchema, RoleDocument, VisibilityScope } from './role.schema';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

describe('Role Schema - RootStock Authorization System', () => {
  let moduleRef: TestingModule;
  let roleModel: Model<RoleDocument>;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
      ],
    }).compile();

    roleModel = moduleRef.get<Model<RoleDocument>>(getModelToken(Role.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongoServer?.stop();
  });

  beforeEach(async () => {
    await roleModel.deleteMany({});
  });

  describe('RootStock Business Role Types', () => {
    it('should create system administrator role for global platform management', async () => {
      // Arrange: System administrator role with full permissions
      const adminRole = new roleModel({
        recordId: 'ROL0001',
        name: 'System Administrator',
        description: 'Full system access for platform administrators',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: Object.values(PERMISSIONS), // All system permissions
        isActive: true,
        isDeleted: false,
      });

      // Act: Save system administrator role
      const savedRole = await adminRole.save();

      // Assert: Administrator role configured for global access
      expect(savedRole.recordId).toBe('ROL0001');
      expect(savedRole.name).toBe('System Administrator');
      expect(savedRole.visibilityScope).toBe(VisibilityScope.GLOBAL);
      expect(savedRole.permissions).toEqual(Object.values(PERMISSIONS));
      expect(savedRole.isActive).toBe(true);
      expect(savedRole.isDeleted).toBe(false);
    });

    it('should create consultant role for subsidiary-level orchard management', async () => {
      // Arrange: Business scenario - consultant managing multiple clients
      const consultantRole = new roleModel({
        recordId: 'ROL0002',
        name: 'Orchard Consultant',
        description: 'Manages orchards for multiple clients within subsidiary',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.ORCHARD_CREATE,
        ],
        isActive: true,
      });

      // Act: Save consultant role
      const savedRole = await consultantRole.save();

      // Assert: Consultant configured for subsidiary scope with orchard permissions
      expect(savedRole.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
      expect(savedRole.permissions).toContain(PERMISSIONS.ORCHARD_VIEW);
      expect(savedRole.permissions).toContain(PERMISSIONS.CLIENT_VIEW);
      expect(savedRole.permissions).not.toContain(PERMISSIONS.SUBSIDIARY_DELETE);
    });

    it('should create grower role for client-specific orchard access', async () => {
      // Arrange: Business scenario - grower managing their own orchards only
      const growerRole = new roleModel({
        recordId: 'ROL0003',
        name: 'Grower',
        description: 'Client user with access to own orchards and data',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.USER_VIEW,
        ],
      });

      // Act: Save grower role
      const savedRole = await growerRole.save();

      // Assert: Grower limited to client-scope visibility
      expect(savedRole.visibilityScope).toBe(VisibilityScope.CLIENT);
      expect(savedRole.permissions).toContain(PERMISSIONS.ORCHARD_VIEW);
      expect(savedRole.permissions).not.toContain(PERMISSIONS.ORCHARD_DELETE);
      expect(savedRole.permissions).not.toContain(PERMISSIONS.CLIENT_CREATE);
    });
  });

  describe('Multi-Tenant Permission System', () => {
    it('should support granular permission combinations for business workflows', async () => {
      // Arrange: Custom business role with specific permission set
      const customRole = new roleModel({
        recordId: 'ROL0004',
        name: 'Spray Manager',
        description: 'Manages spray applications and records',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.CLIENT_VIEW,
          // Future spray-related permissions would go here
        ],
      });

      // Act: Save custom business role
      const savedRole = await customRole.save();

      // Assert: Custom permissions support specific business workflows
      expect(savedRole.permissions).toHaveLength(3);
      expect(savedRole.permissions).toEqual([
        PERMISSIONS.ORCHARD_VIEW,
        PERMISSIONS.ORCHARD_EDIT,
        PERMISSIONS.CLIENT_VIEW,
      ]);
    });

    it('should enforce Resource:Action permission format for consistency', async () => {
      // Arrange: Role with properly formatted permissions
      const formattedRole = new roleModel({
        recordId: 'ROL0005',
        name: 'Test Format Role',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [
          'User:Create',    // Standard format
          'Client:Edit',    // Standard format
          'Orchard:View',   // Standard format
        ],
      });

      // Act: Save role with formatted permissions
      const savedRole = await formattedRole.save();

      // Assert: All permissions follow Resource:Action pattern
      savedRole.permissions.forEach(permission => {
        expect(permission).toMatch(/^[A-Z][a-zA-Z]+:[A-Z][a-zA-Z]+$/);
      });
    });

    it('should support empty permissions for restrictive access scenarios', async () => {
      // Arrange: Business scenario - read-only user with minimal access
      const restrictedRole = new roleModel({
        recordId: 'ROL0006',
        name: 'Restricted Access',
        description: 'Minimal access for compliance or audit purposes',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [], // No action permissions, only visibility scope
      });

      // Act: Save restricted access role
      const savedRole = await restrictedRole.save();

      // Assert: Role exists with no permissions (relies on visibility scope only)
      expect(savedRole.permissions).toEqual([]);
      expect(savedRole.visibilityScope).toBe(VisibilityScope.CLIENT);
    });
  });

  describe('RootStock Entity State Management', () => {
    it('should default to active and not-deleted for new business roles', async () => {
      // Arrange: New role without explicit status settings
      const newRole = new roleModel({
        recordId: 'ROL0007',
        name: 'Default Status Role',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_VIEW],
      });

      // Act: Save new role with default status
      const savedRole = await newRole.save();

      // Assert: Defaults to active business state
      expect(savedRole.isActive).toBe(true);
      expect(savedRole.isDeleted).toBe(false);
      expect((savedRole as any).createdAt).toBeDefined(); // Timestamps enabled
      expect((savedRole as any).updatedAt).toBeDefined();
    });

    it('should support role deactivation for business continuity', async () => {
      // Arrange: Active role that needs deactivation
      const activeRole = new roleModel({
        recordId: 'ROL0008',
        name: 'To Be Deactivated',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.CLIENT_VIEW],
        isActive: true,
      });
      await activeRole.save();

      // Act: Deactivate role for business reasons (e.g., role discontinued)
      const deactivatedRole = await roleModel.findByIdAndUpdate(
        activeRole._id,
        { isActive: false },
        { new: true }
      );

      // Assert: Role deactivated while preserving data
      expect(deactivatedRole?.isActive).toBe(false);
      expect(deactivatedRole?.isDeleted).toBe(false); // Still accessible for reporting
    });

    it('should support soft deletion for data retention requirements', async () => {
      // Arrange: Role that will be deleted but needs historical preservation
      const roleToDelete = new roleModel({
        recordId: 'ROL0009',
        name: 'Historical Role',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [PERMISSIONS.ORCHARD_VIEW],
      });
      await roleToDelete.save();

      // Act: Soft delete role (RolesService pattern)
      const deletedRole = await roleModel.findByIdAndUpdate(
        roleToDelete._id,
        { isDeleted: true, isActive: false },
        { new: true }
      );

      // Assert: Role soft-deleted with preserved data
      expect(deletedRole?.isDeleted).toBe(true);
      expect(deletedRole?.isActive).toBe(false);
      expect(deletedRole?.name).toBe('Historical Role'); // Data preserved
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce unique role names for active roles only', async () => {
      // Arrange: Create active role with specific name
      const activeRole = new roleModel({
        recordId: 'ROL0010',
        name: 'Unique Name Role',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_VIEW],
        isActive: true,
        isDeleted: false,
      });
      await activeRole.save();

      // Act & Assert: Attempt to create another active role with same name should fail
      const duplicateRole = new roleModel({
        recordId: 'ROL0011',
        name: 'Unique Name Role', // Same name
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.CLIENT_VIEW],
        isActive: true,
        isDeleted: false,
      });

      await expect(duplicateRole.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should allow same name for deleted roles (partial index behavior)', async () => {
      // Arrange: Create and delete a role
      const originalRole = new roleModel({
        recordId: 'ROL0012',
        name: 'Reusable Name',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_VIEW],
        isDeleted: true, // Deleted role
      });
      await originalRole.save();

      // Act: Create new active role with same name
      const newRole = new roleModel({
        recordId: 'ROL0013',
        name: 'Reusable Name', // Same name as deleted role
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.CLIENT_VIEW],
        isActive: true,
        isDeleted: false, // Active role
      });

      // Assert: Should succeed due to partial index on isDeleted: false
      const savedRole = await newRole.save();
      expect(savedRole.name).toBe('Reusable Name');
      expect(savedRole.isDeleted).toBe(false);
    });

    it('should require all essential business fields', async () => {
      // Arrange: Role missing required business fields
      const incompleteRole = new roleModel({
        // Missing recordId, name, visibilityScope
        permissions: [PERMISSIONS.USER_VIEW],
      });

      // Act & Assert: Should fail validation for missing required fields
      await expect(incompleteRole.save()).rejects.toThrow(/validation failed/);
    });

    it('should validate visibilityScope enum for business access control', async () => {
      // Arrange: Role with invalid visibility scope
      const invalidScopeRole = new roleModel({
        recordId: 'ROL0014',
        name: 'Invalid Scope Role',
        visibilityScope: 'InvalidScope' as any, // Invalid enum value
        permissions: [PERMISSIONS.USER_VIEW],
      });

      // Act & Assert: Should fail enum validation
      await expect(invalidScopeRole.save()).rejects.toThrow(/is not a valid enum value/);
    });
  });

  describe('RootStock Integration Scenarios', () => {
    it('should support role evolution for growing businesses', async () => {
      // Arrange: Start with basic grower role
      const basicRole = new roleModel({
        recordId: 'ROL0015',
        name: 'Basic Grower',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.ORCHARD_VIEW],
      });
      await basicRole.save();

      // Act: Upgrade to advanced grower with additional permissions
      const upgradedRole = await roleModel.findByIdAndUpdate(
        basicRole._id,
        {
          name: 'Advanced Grower',
          permissions: [
            PERMISSIONS.ORCHARD_VIEW,
            PERMISSIONS.ORCHARD_EDIT,
            PERMISSIONS.CLIENT_VIEW,
          ],
        },
        { new: true }
      );

      // Assert: Role evolved to support business growth
      expect(upgradedRole?.name).toBe('Advanced Grower');
      expect(upgradedRole?.permissions).toHaveLength(3);
      expect(upgradedRole?.permissions).toContain(PERMISSIONS.ORCHARD_EDIT);
    });

    it('should maintain referential integrity with recordId for user assignments', async () => {
      // Arrange: Role that will be referenced by users
      const referencedRole = new roleModel({
        recordId: 'ROL0016',
        name: 'Referenced Role',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW],
      });

      // Act: Save role for user reference
      const savedRole = await referencedRole.save();

      // Assert: Role has stable ID for user.roleId references
      expect(savedRole._id).toBeDefined();
      expect(savedRole.recordId).toBe('ROL0016'); // Business key for display
      expect(typeof savedRole._id.toString()).toBe('string'); // MongoDB ObjectId for relations
    });

    it('should support complex permission matrices for enterprise scenarios', async () => {
      // Arrange: Enterprise role with comprehensive permissions
      const enterpriseRole = new roleModel({
        recordId: 'ROL0017',
        name: 'Enterprise Manager',
        description: 'Comprehensive access for enterprise orchard management',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          // User management
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.USER_CREATE,
          PERMISSIONS.USER_EDIT,
          // Client management  
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.CLIENT_EDIT,
          // Orchard operations
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_CREATE,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.ORCHARD_DELETE,
          // Role management (delegated)
          PERMISSIONS.ROLE_VIEW,
        ],
      });

      // Act: Save enterprise role
      const savedRole = await enterpriseRole.save();

      // Assert: Comprehensive permission set for complex business operations
      expect(savedRole.permissions).toHaveLength(10);
      expect(savedRole.permissions).toContain(PERMISSIONS.USER_CREATE);
      expect(savedRole.permissions).toContain(PERMISSIONS.ORCHARD_DELETE);
      expect(savedRole.permissions).toContain(PERMISSIONS.ROLE_VIEW);
      expect(savedRole.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
    });
  });

  describe('Schema Structure Validation', () => {
    it('should maintain proper MongoDB collection structure for RolesService integration', () => {
      // Assert: Verify schema structure matches service expectations
      expect(roleModel.collection.name).toBe('roles');
      
      const paths = roleModel.schema.paths;
      expect(paths).toHaveProperty('recordId');      // Business identifier
      expect(paths).toHaveProperty('name');          // Display name
      expect(paths).toHaveProperty('description');   // Business description
      expect(paths).toHaveProperty('visibilityScope'); // Access control scope
      expect(paths).toHaveProperty('permissions');   // Action permissions array
      expect(paths).toHaveProperty('isActive');      // Business state
      expect(paths).toHaveProperty('isDeleted');     // Soft delete state
      expect(paths).toHaveProperty('createdAt');     // Audit trail (from timestamps: true)
      expect(paths).toHaveProperty('updatedAt');     // Audit trail (from timestamps: true)
    });

    it('should support the RolesService query patterns for authorization', async () => {
      // Arrange: Set up test roles as RolesService would query them
      await roleModel.create([
        {
          recordId: 'ROL0018',
          name: 'Query Test Admin',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.ROLE_VIEW],
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'ROL0019', 
          name: 'Query Test Inactive',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_VIEW],
          isActive: false, // Inactive
          isDeleted: false,
        },
        {
          recordId: 'ROL0020',
          name: 'Query Test Deleted',
          visibilityScope: VisibilityScope.SUBSIDIARY,
          permissions: [PERMISSIONS.CLIENT_VIEW],
          isActive: false,
          isDeleted: true, // Soft deleted
        },
      ]);

      // Act: Query active roles (typical RolesService pattern)
      const activeRoles = await roleModel.find({
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns only active, non-deleted roles
      expect(activeRoles).toHaveLength(1);
      expect(activeRoles[0].name).toBe('Query Test Admin');
      expect(activeRoles[0].isActive).toBe(true);
      expect(activeRoles[0].isDeleted).toBe(false);
    });
  });
});
