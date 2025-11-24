import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { VisibilityScope } from '../schemas/role.schema';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

describe('CreateRoleDto - RootStock Role Creation Validation', () => {
  
  describe('RootStock Business Role Creation Scenarios', () => {
    it('should validate system administrator role creation', async () => {
      // Arrange: System administrator role with full permissions
      const adminRoleDto = {
        name: 'System Administrator',
        description: 'Full system access for platform management',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: Object.values(PERMISSIONS), // All system permissions
      };

      // Act: Transform and validate admin role DTO
      const dto = plainToClass(CreateRoleDto, adminRoleDto);
      const errors = await validate(dto);

      // Assert: Admin role creation is valid for business operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('System Administrator');
      expect(dto.visibilityScope).toBe(VisibilityScope.GLOBAL);
      expect(dto.permissions).toEqual(Object.values(PERMISSIONS));
    });

    it('should validate orchard consultant role for subsidiary-level access', async () => {
      // Arrange: Consultant role managing multiple clients within subsidiary
      const consultantRoleDto = {
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
      };

      // Act: Validate consultant role for business workflow
      const dto = plainToClass(CreateRoleDto, consultantRoleDto);
      const errors = await validate(dto);

      // Assert: Consultant role properly configured for multi-tenant access
      expect(errors).toHaveLength(0);
      expect(dto.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
      expect(dto.permissions).toContain(PERMISSIONS.ORCHARD_EDIT);
      expect(dto.permissions).not.toContain(PERMISSIONS.SUBSIDIARY_DELETE);
    });

    it('should validate grower role for client-specific orchard management', async () => {
      // Arrange: Grower role limited to own client data
      const growerRoleDto = {
        name: 'Grower',
        description: 'Client user with access to own orchards and data',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.USER_VIEW,
        ],
      };

      // Act: Validate grower role for client access
      const dto = plainToClass(CreateRoleDto, growerRoleDto);
      const errors = await validate(dto);

      // Assert: Grower role properly restricted to client scope
      expect(errors).toHaveLength(0);
      expect(dto.visibilityScope).toBe(VisibilityScope.CLIENT);
      expect(dto.permissions).not.toContain(PERMISSIONS.CLIENT_CREATE);
    });

    it('should validate specialized spray manager role', async () => {
      // Arrange: Specialized role for spray application management
      const sprayManagerDto = {
        name: 'Spray Application Manager',
        description: 'Manages spray applications and compliance records',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.CLIENT_VIEW,
          // Future spray-related permissions would be added here
        ],
      };

      // Act: Validate specialized business role
      const dto = plainToClass(CreateRoleDto, sprayManagerDto);
      const errors = await validate(dto);

      // Assert: Custom role supports specific business workflows
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Spray Application Manager');
      expect(dto.permissions).toHaveLength(3);
    });
  });

  describe('Required Business Field Validation', () => {
    it('should require role name for business identification', async () => {
      // Arrange: Role without name (critical business identifier)
      const incompleteDto = {
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.USER_VIEW],
      };

      // Act: Validate role without name
      const dto = plainToClass(CreateRoleDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: Name is required for role identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should require visibilityScope for multi-tenant access control', async () => {
      // Arrange: Role without visibility scope (critical for data segregation)
      const incompleteDto = {
        name: 'Incomplete Role',
        permissions: [PERMISSIONS.CLIENT_VIEW],
      };

      // Act: Validate role without visibility scope
      const dto = plainToClass(CreateRoleDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: Visibility scope is required for access control
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('visibilityScope');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject invalid string types for business fields', async () => {
      // Arrange: Role with non-string name (data integrity)
      const invalidTypeDto = {
        name: 12345, // Invalid type
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_VIEW],
      };

      // Act: Validate role with invalid field types
      const dto = plainToClass(CreateRoleDto, invalidTypeDto);
      const errors = await validate(dto);

      // Assert: String validation enforces data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject empty string names for business identification', async () => {
      // Arrange: Role with empty name (insufficient for business use)
      const emptyNameDto = {
        name: '',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.ORCHARD_VIEW],
      };

      // Act: Validate role with empty name
      const dto = plainToClass(CreateRoleDto, emptyNameDto);
      const errors = await validate(dto);

      // Assert: Non-empty name required for business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('Multi-Tenant Visibility Scope Validation', () => {
    it('should validate all RootStock visibility scopes', async () => {
      // Arrange: Test all valid visibility scopes for business scenarios
      const testCases = [
        { scope: VisibilityScope.GLOBAL, description: 'System-wide administrator access' },
        { scope: VisibilityScope.SUBSIDIARY, description: 'Consultant managing multiple clients' },
        { scope: VisibilityScope.CLIENT, description: 'Grower with client-specific access' },
      ];

      for (const testCase of testCases) {
        // Act: Validate each business visibility scope
        const dto = plainToClass(CreateRoleDto, {
          name: `Test ${testCase.scope} Role`,
          description: testCase.description,
          visibilityScope: testCase.scope,
          permissions: [PERMISSIONS.USER_VIEW],
        });
        const errors = await validate(dto);

        // Assert: All RootStock visibility scopes are valid
        expect(errors).toHaveLength(0);
        expect(dto.visibilityScope).toBe(testCase.scope);
      }
    });

    it('should reject invalid visibility scope for data security', async () => {
      // Arrange: Role with invalid visibility scope (security risk)
      const invalidScopeDto = {
        name: 'Invalid Scope Role',
        visibilityScope: 'InvalidScope', // Not a valid enum value
        permissions: [PERMISSIONS.CLIENT_VIEW],
      };

      // Act: Validate role with invalid scope
      const dto = plainToClass(CreateRoleDto, invalidScopeDto);
      const errors = await validate(dto);

      // Assert: Invalid scopes rejected to prevent access control bypass
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('visibilityScope');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });
  });

  describe('Permission Array Validation', () => {
    it('should validate Resource:Action permission format', async () => {
      // Arrange: Role with properly formatted permissions
      const validPermissionsDto = {
        name: 'Valid Permissions Role',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          'User:Create',    // Standard Resource:Action format
          'Client:Edit',    // Standard Resource:Action format  
          'Orchard:View',   // Standard Resource:Action format
        ],
      };

      // Act: Validate proper permission format
      const dto = plainToClass(CreateRoleDto, validPermissionsDto);
      const errors = await validate(dto);

      // Assert: Resource:Action format validated successfully
      expect(errors).toHaveLength(0);
      expect(dto.permissions).toHaveLength(3);
      expect(dto.permissions?.every(p => typeof p === 'string')).toBe(true);
    });

    it('should allow empty permissions array for restrictive roles', async () => {
      // Arrange: Role with no permissions (restrictive access)
      const restrictedRoleDto = {
        name: 'Restricted Access Role',
        description: 'Minimal access for compliance or audit purposes',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [], // No action permissions
      };

      // Act: Validate role with empty permissions
      const dto = plainToClass(CreateRoleDto, restrictedRoleDto);
      const errors = await validate(dto);

      // Assert: Empty permissions allowed for restrictive business scenarios
      expect(errors).toHaveLength(0);
      expect(dto.permissions).toEqual([]);
    });

    it('should reject non-string permission values', async () => {
      // Arrange: Role with invalid permission types (data integrity)
      const invalidPermissionsDto = {
        name: 'Invalid Permissions Role',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [
          'User:View',     // Valid string
          12345,           // Invalid number
          true,            // Invalid boolean
          'Client:Edit',   // Valid string
        ],
      };

      // Act: Validate permissions with invalid types
      const dto = plainToClass(CreateRoleDto, invalidPermissionsDto);
      const errors = await validate(dto);

      // Assert: Non-string permission values rejected
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('permissions');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject non-array permission field', async () => {
      // Arrange: Role with permissions as non-array (structure validation)
      const nonArrayPermissionsDto = {
        name: 'Non-Array Permissions Role',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: 'User:View', // Should be array, not string
      };

      // Act: Validate non-array permissions
      const dto = plainToClass(CreateRoleDto, nonArrayPermissionsDto);
      const errors = await validate(dto);

      // Assert: Permissions must be array structure
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('permissions');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });
  });

  describe('Optional Description Field Validation', () => {
    it('should allow role creation without description', async () => {
      // Arrange: Minimal role without description (optional field)
      const minimalRoleDto = {
        name: 'Minimal Role',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.USER_VIEW],
      };

      // Act: Validate role without optional description
      const dto = plainToClass(CreateRoleDto, minimalRoleDto);
      const errors = await validate(dto);

      // Assert: Description is optional for role creation
      expect(errors).toHaveLength(0);
      expect(dto.description).toBeUndefined();
    });

    it('should validate string description when provided', async () => {
      // Arrange: Role with business description
      const describedRoleDto = {
        name: 'Well Described Role',
        description: 'Comprehensive role for enterprise orchard management operations',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.CLIENT_VIEW],
      };

      // Act: Validate role with description
      const dto = plainToClass(CreateRoleDto, describedRoleDto);
      const errors = await validate(dto);

      // Assert: Valid string descriptions accepted
      expect(errors).toHaveLength(0);
      expect(dto.description).toBe('Comprehensive role for enterprise orchard management operations');
    });

    it('should reject non-string description values', async () => {
      // Arrange: Role with invalid description type
      const invalidDescriptionDto = {
        name: 'Invalid Description Role',
        description: 12345, // Should be string
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_CREATE],
      };

      // Act: Validate role with invalid description type
      const dto = plainToClass(CreateRoleDto, invalidDescriptionDto);
      const errors = await validate(dto);

      // Assert: Description must be string type
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('description');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('Real RootStock Permission Combinations', () => {
    it('should validate enterprise manager role with comprehensive permissions', async () => {
      // Arrange: Enterprise role for complex business operations
      const enterpriseRoleDto = {
        name: 'Enterprise Orchard Manager',
        description: 'Full orchard management with user delegation capabilities',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          // User management delegation
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.USER_CREATE,
          PERMISSIONS.USER_EDIT,
          // Client relationship management
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.CLIENT_EDIT,
          // Orchard operations
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_CREATE,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.ORCHARD_DELETE,
          // System monitoring
          PERMISSIONS.ROLE_VIEW,
        ],
      };

      // Act: Validate comprehensive business role
      const dto = plainToClass(CreateRoleDto, enterpriseRoleDto);
      const errors = await validate(dto);

      // Assert: Complex permission matrices supported
      expect(errors).toHaveLength(0);
      expect(dto.permissions).toHaveLength(10);
      expect(dto.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
    });

    it('should validate read-only auditor role for compliance', async () => {
      // Arrange: Auditor role with view-only permissions
      const auditorRoleDto = {
        name: 'Compliance Auditor',
        description: 'Read-only access for audit and compliance reporting',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.SUBSIDIARY_VIEW,
          PERMISSIONS.ROLE_VIEW,
        ],
      };

      // Act: Validate auditor role for compliance workflows
      const dto = plainToClass(CreateRoleDto, auditorRoleDto);
      const errors = await validate(dto);

      // Assert: View-only role supports audit requirements
      expect(errors).toHaveLength(0);
      expect(dto.permissions?.every(p => p.endsWith(':View'))).toBe(true);
      expect(dto.visibilityScope).toBe(VisibilityScope.GLOBAL);
    });

    it('should validate role evolution scenario', async () => {
      // Arrange: Role that can be upgraded as business grows
      const evolvableRoleDto = {
        name: 'Junior Consultant',
        description: 'Entry-level consultant with growth potential',
        visibilityScope: VisibilityScope.CLIENT, // Start with client scope
        permissions: [
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.CLIENT_VIEW,
        ], // Minimal permissions to start
      };

      // Act: Validate junior role for business growth scenarios
      const dto = plainToClass(CreateRoleDto, evolvableRoleDto);
      const errors = await validate(dto);

      // Assert: Role designed for future expansion
      expect(errors).toHaveLength(0);
      expect(dto.permissions).toHaveLength(2);
      expect(dto.visibilityScope).toBe(VisibilityScope.CLIENT);
      // Business expectation: This can later be updated to SUBSIDIARY scope with more permissions
    });
  });

  describe('Business Edge Cases and Data Integrity', () => {
    it('should validate maximum complexity role creation', async () => {
      // Arrange: Role with maximum field lengths and complexity
      const complexRoleDto = {
        name: 'A'.repeat(100), // Long but reasonable role name
        description: 'Detailed business description that explains the comprehensive responsibilities, access levels, and operational scope of this specialized role within the RootStock platform for enterprise-level orchard management operations.',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: Object.values(PERMISSIONS), // All permissions
      };

      // Act: Validate complex role configuration
      const dto = plainToClass(CreateRoleDto, complexRoleDto);
      const errors = await validate(dto);

      // Assert: Complex configurations supported for enterprise needs
      expect(errors).toHaveLength(0);
      expect(dto.name).toHaveLength(100);
      expect(dto.permissions).toEqual(Object.values(PERMISSIONS));
    });

    it('should handle whitespace-only names appropriately', async () => {
      // Arrange: Role with whitespace-only name (poor data quality)
      const whitespaceNameDto = {
        name: '   ', // Only whitespace
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.USER_VIEW],
      };

      // Act: Validate role with whitespace-only name
      const dto = plainToClass(CreateRoleDto, whitespaceNameDto);
      const errors = await validate(dto);

      // Assert: Whitespace-only names should be rejected
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should validate role without optional fields for minimal configuration', async () => {
      // Arrange: Absolutely minimal role (business requirement)
      const minimalRoleDto = {
        name: 'Minimal Role',
        visibilityScope: VisibilityScope.CLIENT,
        // No description, no permissions array
      };

      // Act: Validate minimal role configuration
      const dto = plainToClass(CreateRoleDto, minimalRoleDto);
      const errors = await validate(dto);

      // Assert: Minimal configuration valid for basic business needs
      expect(errors).toHaveLength(0);
      expect(dto.description).toBeUndefined();
      expect(dto.permissions).toBeUndefined();
    });
  });

  describe('Integration with RootStock Role System', () => {
    it('should prepare data for RolesService.create() integration', async () => {
      // Arrange: DTO that mirrors RolesService expectations
      const serviceIntegrationDto = {
        name: 'Service Integration Role',
        description: 'Role designed for RolesService.create() workflow',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.CLIENT_VIEW,
        ],
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(CreateRoleDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by RolesService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('description');
      expect(dto).toHaveProperty('visibilityScope');
      expect(dto).toHaveProperty('permissions');
      
      // Business context: RolesService will add recordId via CountersService
      expect(dto).not.toHaveProperty('recordId'); // Generated by service
      expect(dto).not.toHaveProperty('isActive'); // Defaulted by schema
      expect(dto).not.toHaveProperty('isDeleted'); // Defaulted by schema
    });

    it('should support role creation for seeded system roles', async () => {
      // Arrange: System role matching seed data patterns (like seed.ts)
      const systemRoleDto = {
        name: 'System Consultant',
        description: 'Standard consultant role with subsidiary-level access',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
        ],
      };

      // Act: Validate system role for consistency with seed data
      const dto = plainToClass(CreateRoleDto, systemRoleDto);
      const errors = await validate(dto);

      // Assert: System roles follow same validation as user-created roles
      expect(errors).toHaveLength(0);
      expect(dto.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
      expect(dto.permissions).toContain(PERMISSIONS.ORCHARD_VIEW);
    });
  });
});
