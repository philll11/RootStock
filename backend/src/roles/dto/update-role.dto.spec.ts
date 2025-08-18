import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateRoleDto } from './update-role.dto';
import { VisibilityScope } from '../schemas/role.schema';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

describe('UpdateRoleDto', () => {
  // Helper function to validate a DTO instance
  const validateDto = async (dto: UpdateRoleDto) => {
    const instance = plainToInstance(UpdateRoleDto, dto);
    const errors = await validate(instance);
    return { instance, errors };
  };

  describe('Business Role Update Scenarios', () => {
    it('should successfully validate administrator role permission updates', async () => {
      const dto: UpdateRoleDto = {
        name: 'Global Administrator',
        description: 'Full system access with all permissions',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [
          PERMISSIONS.USER_CREATE, 
          PERMISSIONS.USER_EDIT, 
          PERMISSIONS.USER_DELETE,
          PERMISSIONS.CLIENT_CREATE, 
          PERMISSIONS.CLIENT_EDIT, 
          PERMISSIONS.CLIENT_DELETE,
          PERMISSIONS.ROLE_CREATE, 
          PERMISSIONS.ROLE_EDIT, 
          PERMISSIONS.ROLE_DELETE,
          PERMISSIONS.SUBSIDIARY_CREATE
        ]
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate consultant role scope reduction', async () => {
      const dto: UpdateRoleDto = {
        name: 'Regional Consultant',
        description: 'Subsidiary-level consultant access',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW, 
          PERMISSIONS.CLIENT_EDIT,
          PERMISSIONS.ORCHARD_VIEW, 
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.USER_VIEW
        ]
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate grower role permission expansion', async () => {
      const dto: UpdateRoleDto = {
        name: 'Advanced Grower',
        description: 'Grower with enhanced data management capabilities',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.ORCHARD_VIEW, 
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.USER_CREATE // New permission being added
        ]
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Role Activation/Deactivation Business Logic', () => {
    it('should successfully validate role deactivation update', async () => {
      const dto: UpdateRoleDto = {
        isActive: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isActive).toBe(false);
    });

    it('should successfully validate role reactivation update', async () => {
      const dto: UpdateRoleDto = {
        name: 'Reactivated Role',
        isActive: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isActive).toBe(true);
    });
  });

  describe('Partial Update Validation', () => {
    it('should successfully validate when updating only name', async () => {
      const dto: UpdateRoleDto = {
        name: 'Updated Role Name'
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate when updating only description', async () => {
      const dto: UpdateRoleDto = {
        description: 'Updated role description'
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate when updating only visibility scope', async () => {
      const dto: UpdateRoleDto = {
        visibilityScope: VisibilityScope.SUBSIDIARY
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate when updating only permissions array', async () => {
      const dto: UpdateRoleDto = {
        permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW]
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should successfully validate empty updates (all optional)', async () => {
      const dto: UpdateRoleDto = {};

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Business Rule Validation', () => {
    it('should handle whitespace trimming for name updates', async () => {
      const dto: UpdateRoleDto = {
        name: '  Trimmed Role Name  '
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.name).toBe('Trimmed Role Name');
    });

    it('should handle whitespace trimming for description updates', async () => {
      const dto: UpdateRoleDto = {
        description: '  Trimmed description  '
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.description).toBe('Trimmed description');
    });

    it('should reject whitespace-only name updates', async () => {
      const dto: UpdateRoleDto = {
        name: '   '
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should accept empty description (optional field)', async () => {
      const dto: UpdateRoleDto = {
        description: ''
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.description).toBe('');
    });
  });

  describe('Visibility Scope Validation', () => {
    it('should validate all supported visibility scope updates', async () => {
      const validScopes = [
        VisibilityScope.GLOBAL,
        VisibilityScope.SUBSIDIARY, 
        VisibilityScope.CLIENT
      ];

      for (const scope of validScopes) {
        const dto: UpdateRoleDto = {
          visibilityScope: scope
        };

        const { errors } = await validateDto(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid visibility scope values', async () => {
      const dto = {
        visibilityScope: 'INVALID_SCOPE'
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('visibilityScope');
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });
  });

  describe('Permissions Array Validation', () => {
    it('should validate business-relevant permission combinations', async () => {
      const businessPermissionCombos = [
        // Grower permissions
        [PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_EDIT],
        
        // Consultant permissions
        [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_EDIT, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.USER_VIEW],
        
        // Administrator permissions
        [PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE, PERMISSIONS.ROLE_EDIT],
        
        // Read-only permissions
        [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.USER_VIEW]
      ];

      for (const permissions of businessPermissionCombos) {
        const dto: UpdateRoleDto = {
          permissions
        };

        const { errors } = await validateDto(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate empty permissions array (minimal access role)', async () => {
      const dto: UpdateRoleDto = {
        permissions: []
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string permission values', async () => {
      const dto = {
        permissions: [PERMISSIONS.CLIENT_VIEW, 123, PERMISSIONS.USER_VIEW]
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('permissions');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should reject non-array permission values', async () => {
      const dto = {
        permissions: 'not-an-array'
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('permissions');
      expect(errors[0].constraints?.isArray).toBeDefined();
    });
  });

  describe('Multi-field Business Update Scenarios', () => {
    it('should validate comprehensive role restructuring', async () => {
      const dto: UpdateRoleDto = {
        name: 'Restructured Operations Manager',
        description: 'Regional operations with enhanced client management',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW, 
          PERMISSIONS.CLIENT_EDIT,
          PERMISSIONS.ORCHARD_VIEW, 
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.USER_VIEW, 
          PERMISSIONS.USER_EDIT
        ],
        isActive: true
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate role permission reduction during restructuring', async () => {
      const dto: UpdateRoleDto = {
        name: 'Limited Access Consultant',
        description: 'Reduced permissions for external consultant',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.ORCHARD_VIEW], // Significantly reduced
        isActive: true
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate temporary role deactivation with permission preservation', async () => {
      const dto: UpdateRoleDto = {
        name: 'Temporarily Inactive Manager',
        description: 'Role temporarily deactivated for system maintenance',
        isActive: false
        // Permissions and scope unchanged
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Data Quality and Edge Cases', () => {
    it('should handle undefined values properly (inherit from CreateRoleDto)', async () => {
      const dto: UpdateRoleDto = {
        name: undefined,
        description: undefined,
        visibilityScope: undefined,
        permissions: undefined,
        isActive: undefined
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate maximum realistic permission array size', async () => {
      // Test with all available permissions
      const allPermissions = Object.values(PERMISSIONS);
      const dto: UpdateRoleDto = {
        permissions: allPermissions
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle business edge case: role with name but no permissions', async () => {
      const dto: UpdateRoleDto = {
        name: 'No Access Role',
        description: 'Role with no system permissions',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [],
        isActive: false
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
