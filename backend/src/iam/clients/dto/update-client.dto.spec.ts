import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateClientDto } from './update-client.dto';

// Mock the validator constraint before importing the DTO
const mockValidatorConstraint = {
  validate: jest.fn().mockResolvedValue(true),
  defaultMessage: jest.fn().mockReturnValue('subsidiaryId must reference a valid subsidiary'),
};

// Mock the entire validator file
jest.mock('../../subsidiaries/validators/is-existing-subsidiary.validator', () => ({
  IsExistingSubsidiaryConstraint: jest.fn().mockImplementation(() => mockValidatorConstraint),
}));

// Mock the decorator to use our mocked constraint
jest.mock('../../subsidiaries/decorators/is-existing-subsidiary.decorator', () => ({
  IsExistingSubsidiary: () => () => {}, // No-op decorator for unit tests
}));

describe('UpdateClientDto - RootStock Client Update Validation', () => {

  describe('RootStock Business Client Update Scenarios', () => {
    it('should validate client rebranding update', async () => {
      // Arrange: Business rebranding scenario
      const rebrandDto = {
        name: 'Premium Valley Orchards LLC',
      };

      // Act: Transform and validate rebrand DTO
      const dto = plainToClass(UpdateClientDto, rebrandDto);
      const errors = await validate(dto);

      // Assert: Rebranding update is valid for business operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Valley Orchards LLC');
    });

    it('should validate subsidiary relationship change', async () => {
      // Arrange: Client moving to different subsidiary management
      const subsidiaryChangeDto = {
        subsidiaryId: '507f1f77bcf86cd799439012',
      };

      // Act: Validate subsidiary change for business restructuring
      const dto = plainToClass(UpdateClientDto, subsidiaryChangeDto);
      const errors = await validate(dto);

      // Assert: Subsidiary changes supported for business flexibility
      expect(errors).toHaveLength(0);
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439012');
    });

    it('should validate client independence transition', async () => {
      // Arrange: Client becoming independent from subsidiary
      const independenceDto = {
        name: 'Independent Valley Operations',
        subsidiaryId: null,
        isActive: true,
      };

      // Act: Validate independence transition
      const dto = plainToClass(UpdateClientDto, independenceDto);
      const errors = await validate(dto);

      // Assert: Independence transition supported for business growth
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Independent Valley Operations');
      expect(dto.subsidiaryId).toBeNull();
      expect(dto.isActive).toBe(true);
    });

    it('should validate seasonal client status management', async () => {
      // Arrange: Seasonal orchard client deactivation
      const seasonalDto = {
        isActive: false,
      };

      // Act: Validate seasonal status change
      const dto = plainToClass(UpdateClientDto, seasonalDto);
      const errors = await validate(dto);

      // Assert: Seasonal status changes supported for agricultural business
      expect(errors).toHaveLength(0);
      expect(dto.isActive).toBe(false);
    });
  });

  describe('Required Business Field Validation', () => {
    it('should reject empty name updates for business identification', async () => {
      // Arrange: Update with empty name (insufficient for business)
      const emptyNameDto = { name: '' };

      // Act: Validate empty name update
      const dto = plainToClass(UpdateClientDto, emptyNameDto);
      const errors = await validate(dto);

      // Assert: Empty names rejected to maintain business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject non-string name values for data integrity', async () => {
      // Arrange: Update with invalid name type
      const invalidTypeDto = {
        name: 12345, // Invalid type
      };

      // Act: Validate update with invalid field types
      const dto = plainToClass(UpdateClientDto, invalidTypeDto);
      const errors = await validate(dto);

      // Assert: String validation enforces data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject whitespace-only name updates', async () => {
      // Arrange: Update with whitespace-only name (insufficient business data)
      const whitespaceDto = { name: '   ' };

      // Act: Validate whitespace-only name update
      const dto = plainToClass(UpdateClientDto, whitespaceDto);
      const errors = await validate(dto);

      // Assert: Whitespace-only names rejected for business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('Subsidiary Relationship Update Validation', () => {
    it('should validate all subsidiary update scenarios', async () => {
      // Arrange: Test all valid subsidiary update scenarios
      const testCases = [
        { subsidiaryId: '507f1f77bcf86cd799439011', description: 'Moving to new subsidiary management' },
        { subsidiaryId: null, description: 'Becoming independent client' },
        { subsidiaryId: '000000000000000000000000', description: 'Edge case minimum ObjectId' },
      ];

      for (const testCase of testCases) {
        // Act: Validate each subsidiary relationship update
        const dto = plainToClass(UpdateClientDto, {
          subsidiaryId: testCase.subsidiaryId,
        });
        const errors = await validate(dto);

        // Assert: All valid subsidiary updates are accepted
        expect(errors).toHaveLength(0);
        expect(dto.subsidiaryId).toBe(testCase.subsidiaryId);
      }
    });

    it('should reject invalid subsidiary ObjectId formats for data security', async () => {
      // Arrange: Update with invalid subsidiary ObjectId (security risk)
      const invalidSubsidiaryDto = {
        subsidiaryId: 'invalid-objectid-format', // Not a valid ObjectId
      };

      // Act: Validate update with invalid subsidiary ID
      const dto = plainToClass(UpdateClientDto, invalidSubsidiaryDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected to prevent data integrity issues
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('subsidiaryId');
      expect(errors[0].constraints).toHaveProperty('isMongoId');
    });
  });

  describe('Business Status Management Updates', () => {
    it('should validate client activation and deactivation', async () => {
      // Arrange: Test client status changes for business operations
      const statusChanges = [
        { isActive: true, description: 'Activating client for new season' },
        { isActive: false, description: 'Deactivating client for off-season' },
      ];

      for (const statusChange of statusChanges) {
        // Act: Validate business status change
        const dto = plainToClass(UpdateClientDto, {
          isActive: statusChange.isActive,
        });
        const errors = await validate(dto);

        // Assert: Status changes supported for business management
        expect(errors).toHaveLength(0);
        expect(dto.isActive).toBe(statusChange.isActive);
      }
    });
  });

  describe('Comprehensive Business Update Scenarios', () => {
    it('should validate complete client transformation', async () => {
      // Arrange: Complete business transformation update
      const transformationDto = {
        name: 'Transformed Premium Orchards',
        subsidiaryId: '507f1f77bcf86cd799439013',
        isActive: true,
      };

      // Act: Validate comprehensive business update
      const dto = plainToClass(UpdateClientDto, transformationDto);
      const errors = await validate(dto);

      // Assert: Complete transformations supported for business evolution
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Transformed Premium Orchards');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439013');
      expect(dto.isActive).toBe(true);
    });

    it('should validate minimal single-field updates', async () => {
      // Arrange: Test minimal targeted updates for each field
      const singleFieldUpdates = [
        { name: 'Only Name Change' },
        { subsidiaryId: '507f1f77bcf86cd799439014' },
        { isActive: false }
      ];

      for (const update of singleFieldUpdates) {
        // Act: Validate targeted single-field update
        const dto = plainToClass(UpdateClientDto, update);
        const errors = await validate(dto);

        // Assert: Single-field updates supported for efficient operations
        expect(errors).toHaveLength(0);
        Object.keys(update).forEach(key => {
          expect(dto[key as keyof UpdateClientDto]).toEqual(update[key as keyof typeof update]);
        });
      }
    });

    it('should accept completely empty updates for API flexibility', async () => {
      // Arrange: Empty update object (no changes scenario)
      const emptyUpdate = {};

      // Act: Validate empty update
      const dto = plainToClass(UpdateClientDto, emptyUpdate);
      const errors = await validate(dto);

      // Assert: Empty updates accepted for API flexibility
      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.subsidiaryId).toBeUndefined();
      expect(dto.isActive).toBeUndefined();
    });
  });

  describe('Business Data Quality Updates', () => {
    it('should handle international client name updates', async () => {
      // Arrange: International business name updates
      const internationalUpdates = [
        'Café des Pommes Nouvelles',
        'Müller Obstbau Erweiterung GmbH',
        'López Naranjas Expansión S.A.'
      ];

      for (const name of internationalUpdates) {
        // Act: Validate international name update
        const dto = plainToClass(UpdateClientDto, { name });
        const errors = await validate(dto);

        // Assert: International names supported for global business
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(name);
      }
    });

    it('should validate PartialType inheritance behavior', async () => {
      // Arrange: Verify PartialType makes all CreateClientDto fields optional
      const inheritedDto = {
        name: 'Inherited Field Validation',
        subsidiaryId: '507f1f77bcf86cd799439015'
      };

      // Act: Validate PartialType inheritance
      const dto = plainToClass(UpdateClientDto, inheritedDto);
      const errors = await validate(dto);

      // Assert: PartialType inheritance works correctly for flexible updates
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Inherited Field Validation');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439015');
      expect(dto).toBeInstanceOf(UpdateClientDto);
    });
  });
});
