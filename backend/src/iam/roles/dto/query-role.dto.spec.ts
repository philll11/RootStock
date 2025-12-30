import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryRoleDto } from './query-role.dto';

describe('QueryRoleDto', () => {
  // Helper function to validate a DTO instance
  const validateDto = async (dto: QueryRoleDto) => {
    const instance = plainToInstance(QueryRoleDto, dto);
    const errors = await validate(instance);
    return { instance, errors };
  };

  describe('Business Role Filtering Scenarios', () => {
    it('should successfully validate administrator role search by recordId', async () => {
      const dto: QueryRoleDto = {
        recordId: 'ROL0001'
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.recordId).toBe('ROL0001');
    });

    it('should successfully validate consultant role search by name', async () => {
      const dto: QueryRoleDto = {
        name: 'Regional Consultant'
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.name).toBe('Regional Consultant');
    });

    it('should successfully validate grower role search by partial name', async () => {
      const dto: QueryRoleDto = {
        name: 'Grower'
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.name).toBe('Grower');
    });
  });

  describe('Role Status Filtering for Business Operations', () => {
    it('should successfully filter for active roles only', async () => {
      const dto: QueryRoleDto = {
        isActive: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isActive).toBe(true);
      expect(typeof instance.isActive).toBe('boolean');
    });

    it('should successfully filter for inactive roles (maintenance scenario)', async () => {
      const dto: QueryRoleDto = {
        isActive: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isActive).toBe(false);
    });

    it('should successfully filter for deleted roles (audit scenario)', async () => {
      const dto: QueryRoleDto = {
        isDeleted: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isDeleted).toBe(true);
    });

    it('should successfully filter for non-deleted active roles (normal operations)', async () => {
      const dto: QueryRoleDto = {
        isDeleted: false,
        isActive: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isDeleted).toBe(false);
      expect(instance.isActive).toBe(true);
    });
  });

  describe('Administrative Filtering with includeInactives', () => {
    it('should successfully include inactive roles for administrative review', async () => {
      const dto: QueryRoleDto = {
        includeInactives: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.includeInactives).toBe(true);
    });

    it('should successfully exclude inactive roles for standard operations', async () => {
      const dto: QueryRoleDto = {
        includeInactives: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.includeInactives).toBe(false);
    });

    it('should validate comprehensive admin query with all inactive data', async () => {
      const dto: QueryRoleDto = {
        includeInactives: true,
        isDeleted: false,
        isActive: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.includeInactives).toBe(true);
      expect(instance.isDeleted).toBe(false);
      expect(instance.isActive).toBe(false);
    });
  });

  describe('Boolean Field Validation (Business Logic)', () => {
    it('should successfully validate business query with boolean filters', async () => {
      const dto: QueryRoleDto = {
        isActive: true,
        isDeleted: false,
        includeInactives: false
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle boolean type validation properly', async () => {
      const dto: QueryRoleDto = {
        isActive: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(typeof instance.isActive).toBe('boolean');
    });
  });

  describe('Multi-field Business Query Scenarios', () => {
    it('should validate role audit query (name + status filters)', async () => {
      const dto: QueryRoleDto = {
        name: 'Administrator',
        isActive: false,
        isDeleted: false,
        includeInactives: true
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.name).toBe('Administrator');
      expect(instance.isActive).toBe(false);
      expect(instance.isDeleted).toBe(false);
      expect(instance.includeInactives).toBe(true);
    });

    it('should validate role cleanup query (find deleted roles)', async () => {
      const dto: QueryRoleDto = {
        isDeleted: true,
        isActive: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isDeleted).toBe(true);
      expect(instance.isActive).toBe(false);
    });

    it('should validate role migration query (find specific roles for update)', async () => {
      const dto: QueryRoleDto = {
        recordId: 'ROL0042',
        name: 'Legacy Grower',
        isActive: true,
        includeInactives: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.recordId).toBe('ROL0042');
      expect(instance.name).toBe('Legacy Grower');
      expect(instance.isActive).toBe(true);
      expect(instance.includeInactives).toBe(false);
    });
  });

  describe('Empty and Default Query Handling', () => {
    it('should successfully validate empty query (no filters)', async () => {
      const dto: QueryRoleDto = {};

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle undefined values properly', async () => {
      const dto: QueryRoleDto = {
        recordId: undefined,
        name: undefined,
        isDeleted: undefined,
        isActive: undefined,
        includeInactives: undefined
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle null values properly', async () => {
      const dto = {
        recordId: null,
        name: null,
        isDeleted: null,
        isActive: null,
        includeInactives: null
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Business Rule Edge Cases', () => {
    it('should validate role search by exact recordId format', async () => {
      const businessRecordIds = [
        'ROL0001', // Standard format
        'ROL0999', // High sequence number
        'ROL1234'  // Mid-range number
      ];

      for (const recordId of businessRecordIds) {
        const dto: QueryRoleDto = {
          recordId
        };

        const { errors } = await validateDto(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate role search by business-relevant names', async () => {
      const businessRoleNames = [
        'System Administrator',
        'Regional Consultant', 
        'Orchard Manager',
        'Data Entry Specialist',
        'Client Relationship Manager',
        'Field Technician'
      ];

      for (const name of businessRoleNames) {
        const dto: QueryRoleDto = {
          name
        };

        const { errors } = await validateDto(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle special characters in role names', async () => {
      const dto: QueryRoleDto = {
        name: 'Grower - Organic Specialist (Premium)'
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.name).toBe('Grower - Organic Specialist (Premium)');
    });
  });

  describe('Data Quality Validation', () => {
    it('should reject non-string recordId values', async () => {
      const dto = {
        recordId: 123
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('recordId');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should reject non-string name values', async () => {
      const dto = {
        name: 456
      };

      const { errors } = await validateDto(dto as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Business Query Performance Considerations', () => {
    it('should validate efficient active roles query', async () => {
      const dto: QueryRoleDto = {
        isActive: true,
        isDeleted: false
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.isActive).toBe(true);
      expect(instance.isDeleted).toBe(false);
    });

    it('should validate indexed recordId lookup query', async () => {
      const dto: QueryRoleDto = {
        recordId: 'ROL0001'
      };

      const { instance, errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
      expect(instance.recordId).toBe('ROL0001');
    });

    it('should validate complex administrative query with all filters', async () => {
      const dto: QueryRoleDto = {
        recordId: 'ROL0001',
        name: 'Administrator',
        isDeleted: false,
        isActive: true,
        includeInactives: false
      };

      const { errors } = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
