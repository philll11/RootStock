import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

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

describe('CreateClientDto - RootStock Client Creation Validation', () => {
  
  describe('RootStock Business Client Creation Scenarios', () => {
    it('should validate independent orchard client creation', async () => {
      // Arrange: Independent grower client with no subsidiary management
      const independentClientDto = {
        name: 'Valley Vista Orchards',
        subsidiaryId: null,
      };

      // Act: Transform and validate independent client DTO
      const dto = plainToClass(CreateClientDto, independentClientDto);
      const errors = await validate(dto);

      // Assert: Independent client creation is valid for business operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Valley Vista Orchards');
      expect(dto.subsidiaryId).toBeNull();
    });

    it('should validate enterprise client under subsidiary management', async () => {
      // Arrange: Enterprise client managed by consulting subsidiary
      const enterpriseClientDto = {
        name: 'Premium Apple Cooperative',
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate enterprise client for business workflow
      const dto = plainToClass(CreateClientDto, enterpriseClientDto);
      const errors = await validate(dto);

      // Assert: Enterprise client properly configured for subsidiary management
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Apple Cooperative');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
    });

    it('should validate international client with unicode characters', async () => {
      // Arrange: International orchard business with unicode name
      const internationalClientDto = {
        name: 'Yamada-san りんご農園', // Japanese apple orchard
        subsidiaryId: '507f1f77bcf86cd799439012',
      };

      // Act: Validate international client for global operations
      const dto = plainToClass(CreateClientDto, internationalClientDto);
      const errors = await validate(dto);

      // Assert: International client names supported for global business
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Yamada-san りんご農園');
    });

    it('should validate family farm cooperative creation', async () => {
      // Arrange: Family-owned cooperative orchard business
      const familyFarmDto = {
        name: 'Johnson Family Fruit Farm Co-op',
        subsidiaryId: null,
      };

      // Act: Validate family farm client
      const dto = plainToClass(CreateClientDto, familyFarmDto);
      const errors = await validate(dto);

      // Assert: Family farm structures supported for agricultural business
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Johnson Family Fruit Farm Co-op');
      expect(dto.subsidiaryId).toBeNull();
    });
  });

  describe('Required Business Field Validation', () => {
    it('should require client name for business identification', async () => {
      // Arrange: Client without name (critical business identifier)
      const incompleteDto = {
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate client without name
      const dto = plainToClass(CreateClientDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: Name is required for client identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject empty string names for business identification', async () => {
      // Arrange: Client with empty name (insufficient for business use)
      const emptyNameDto = {
        name: '',
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate client with empty name
      const dto = plainToClass(CreateClientDto, emptyNameDto);
      const errors = await validate(dto);

      // Assert: Non-empty name required for business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject non-string name values for data integrity', async () => {
      // Arrange: Client with invalid name type
      const invalidTypeDto = {
        name: 12345, // Invalid type
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate client with invalid field types
      const dto = plainToClass(CreateClientDto, invalidTypeDto);
      const errors = await validate(dto);

      // Assert: String validation enforces data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject whitespace-only names for business identification', async () => {
      // Arrange: Client with whitespace-only name (insufficient for business)
      const whitespaceNameDto = {
        name: '   ', // Only whitespace
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate client with whitespace-only name
      const dto = plainToClass(CreateClientDto, whitespaceNameDto);
      const errors = await validate(dto);

      // Assert: Whitespace-only names rejected for business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('Subsidiary Relationship Validation', () => {
    it('should validate all subsidiary relationship scenarios', async () => {
      // Arrange: Test valid subsidiary relationships for business scenarios
      const testCases = [
        { subsidiaryId: '507f1f77bcf86cd799439011', description: 'Client under consulting subsidiary management' },
        { subsidiaryId: null, description: 'Independent client without subsidiary oversight' },
        { subsidiaryId: '000000000000000000000000', description: 'Edge case minimum ObjectId' },
      ];

      for (const testCase of testCases) {
        // Act: Validate each business subsidiary relationship
        const dto = plainToClass(CreateClientDto, {
          name: `Test Client - ${testCase.description}`,
          subsidiaryId: testCase.subsidiaryId,
        });
        const errors = await validate(dto);

        // Assert: All valid subsidiary relationships are accepted
        expect(errors).toHaveLength(0);
        expect(dto.subsidiaryId).toBe(testCase.subsidiaryId);
      }
    });

    it('should reject invalid subsidiary ObjectId formats for data security', async () => {
      // Arrange: Client with invalid subsidiary ObjectId (security risk)
      const invalidSubsidiaryDto = {
        name: 'Invalid Subsidiary Client',
        subsidiaryId: 'invalid-objectid-format', // Not a valid ObjectId
      };

      // Act: Validate client with invalid subsidiary ID
      const dto = plainToClass(CreateClientDto, invalidSubsidiaryDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected to prevent data integrity issues
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('subsidiaryId');
      expect(errors[0].constraints).toHaveProperty('isMongoId');
    });
  });

  describe('Business Data Quality Validation', () => {
    it('should handle maximum business complexity client creation', async () => {
      // Arrange: Client with maximum field lengths and complexity
      const complexClientDto = {
        name: 'Premium Organic Sustainable Mountain Valley Apple and Stone Fruit Cooperative Association Ltd.',
        subsidiaryId: 'ffffffffffffffffffffffff', // Maximum ObjectId
      };

      // Act: Validate complex client configuration
      const dto = plainToClass(CreateClientDto, complexClientDto);
      const errors = await validate(dto);

      // Assert: Complex configurations supported for enterprise needs
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Organic Sustainable Mountain Valley Apple and Stone Fruit Cooperative Association Ltd.');
      expect(dto.subsidiaryId).toBe('ffffffffffffffffffffffff');
    });

    it('should validate minimal independent client for business flexibility', async () => {
      // Arrange: Minimal client data (name only, independent operation)
      const minimalClientDto = {
        name: 'Simple Farm',
        subsidiaryId: null,
      };

      // Act: Validate minimal client configuration
      const dto = plainToClass(CreateClientDto, minimalClientDto);
      const errors = await validate(dto);

      // Assert: Minimal configuration supports independent business operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Simple Farm');
      expect(dto.subsidiaryId).toBeNull();
    });

    it('should handle special characters in international business names', async () => {
      // Arrange: International client names with special characters
      const internationalNames = [
        'Café des Pommes',
        'Müller Obstbau GmbH', 
        'Naranjas López S.A.',
        'São Paulo Frutas Ltda'
      ];

      for (const name of internationalNames) {
        // Act: Validate international business names
        const dto = plainToClass(CreateClientDto, {
          name,
          subsidiaryId: '507f1f77bcf86cd799439011',
        });
        const errors = await validate(dto);

        // Assert: International business names supported
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(name);
      }
    });
  });

  describe('Integration with RootStock Client System', () => {
    it('should prepare data for ClientsService.create() integration', async () => {
      // Arrange: DTO that mirrors ClientsService expectations
      const serviceIntegrationDto = {
        name: 'Service Integration Client',
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(CreateClientDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by ClientsService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('subsidiaryId');
      
      // Business context: ClientsService will add recordId via CountersService
      expect(dto).not.toHaveProperty('recordId'); // Generated by service
      expect(dto).not.toHaveProperty('isActive'); // Defaulted by schema
      expect(dto).not.toHaveProperty('isDeleted'); // Defaulted by schema
    });

    it('should support client creation for seeded system clients', async () => {
      // Arrange: System client matching seed data patterns
      const systemClientDto = {
        name: 'Demo Orchard Operations',
        subsidiaryId: '507f1f77bcf86cd799439011',
      };

      // Act: Validate system client for consistency with seed data
      const dto = plainToClass(CreateClientDto, systemClientDto);
      const errors = await validate(dto);

      // Assert: System clients follow same validation as user-created clients
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Demo Orchard Operations');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
    });
  });
});
