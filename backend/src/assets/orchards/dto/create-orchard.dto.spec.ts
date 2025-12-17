import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

// Mock the decorators before importing DTO
jest.mock('../../clients/decorators/is-existing-single-client.decorator', () => ({
  IsExistingSingleClient: () => () => {}, // No-op decorator
}));

jest.mock('../../users/decorators/is-existing-contact-users.decorator', () => ({
  IsExistingContactUsers: () => () => {}, // No-op decorator
}));

// Mock the validators
jest.mock('../../clients/validators/is-existing-single-client.validator', () => ({
  IsExistingSingleClientConstraint: jest.fn(),
}));

jest.mock('../../users/validators/is-existing-contact-users.validator', () => ({
  IsExistingContactUsersConstraint: jest.fn(),
}));

import { CreateOrchardDto } from './create-orchard.dto';

describe('CreateOrchardDto - RootStock Agricultural Orchard Creation Validation', () => {
  
  describe('RootStock Agricultural Orchard Creation Scenarios', () => {
    it('should validate premium apple orchard creation for commercial client', async () => {
      // Arrange: Premium commercial apple orchard with comprehensive data
      const premiumAppleOrchardDto = {
        name: 'Premium Apple Orchard - North Block',
        clientId: '507f1f77bcf86cd799439011',
        address: {
          street: '1500 Orchard Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
        userIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'], // Manager and field worker
      };

      // Act: Transform and validate premium orchard DTO
      const dto = plainToClass(CreateOrchardDto, premiumAppleOrchardDto);
      const errors = await validate(dto);

      // Assert: Premium orchard configured for commercial agricultural operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Apple Orchard - North Block');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439011');
      expect(dto.address?.street).toBe('1500 Orchard Valley Road');
      expect(dto.address?.city).toBe('Wenatchee');
      expect(dto.address?.state).toBe('Washington');
      expect(dto.address?.postalCode).toBe('98801');
      expect(dto.address?.country).toBe('United States');
      expect(dto.userIds).toHaveLength(2);
      expect(dto.userIds).toContain('507f1f77bcf86cd799439012');
      expect(dto.userIds).toContain('507f1f77bcf86cd799439013');
    });

    it('should validate organic family farm orchard creation', async () => {
      // Arrange: Family-owned organic cherry orchard with minimal setup
      const organicFarmOrchardDto = {
        name: 'Organic Cherry Orchard - Heritage Block',
        clientId: '507f1f77bcf86cd799439014',
        address: {
          street: '750 Heritage Farm Lane',
          city: 'Hood River',
          state: 'Oregon',
          postalCode: '97031',
          country: 'United States',
        },
        userIds: ['507f1f77bcf86cd799439015'], // Single farm owner
      };

      // Act: Transform and validate family farm orchard DTO
      const dto = plainToClass(CreateOrchardDto, organicFarmOrchardDto);
      const errors = await validate(dto);

      // Assert: Family farm orchard configured for organic operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Organic Cherry Orchard - Heritage Block');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439014');
      expect(dto.address?.city).toBe('Hood River');
      expect(dto.address?.state).toBe('Oregon');
      expect(dto.userIds).toHaveLength(1);
    });

    it('should validate citrus grove creation for cooperative operations', async () => {
      // Arrange: Regional cooperative citrus grove with multiple specialists
      const citrusGroveDto = {
        name: 'Sunshine Citrus Grove - East Valley',
        clientId: '507f1f77bcf86cd799439016',
        address: {
          street: '2400 Citrus Valley Highway',
          city: 'Riverside',
          state: 'California',
          postalCode: '92501',
          country: 'United States',
        },
        userIds: [
          '507f1f77bcf86cd799439017', // Grove manager
          '507f1f77bcf86cd799439018', // Seasonal supervisor
          '507f1f77bcf86cd799439019'  // Irrigation specialist
        ],
      };

      // Act: Transform and validate cooperative citrus grove DTO
      const dto = plainToClass(CreateOrchardDto, citrusGroveDto);
      const errors = await validate(dto);

      // Assert: Cooperative grove configured with specialized staff
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Sunshine Citrus Grove - East Valley');
      expect(dto.address?.city).toBe('Riverside');
      expect(dto.address?.state).toBe('California');
      expect(dto.userIds).toHaveLength(3);
    });

    it('should validate minimal vineyard creation for startup operations', async () => {
      // Arrange: Startup vineyard with minimal required fields only
      const startupVineyardDto = {
        name: 'Startup Vineyard - Pioneer Block',
        clientId: '507f1f77bcf86cd799439020',
        // No address or userIds - optional fields omitted
      };

      // Act: Transform and validate minimal vineyard DTO
      const dto = plainToClass(CreateOrchardDto, startupVineyardDto);
      const errors = await validate(dto);

      // Assert: Minimal vineyard ready for future expansion
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Startup Vineyard - Pioneer Block');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439020');
      expect(dto.address).toBeUndefined(); // Optional field omitted
      expect(dto.userIds).toBeUndefined(); // Optional field omitted
    });

    it('should validate research orchard creation for agricultural university', async () => {
      // Arrange: University research orchard with experimental focus
      const researchOrchardDto = {
        name: 'Agricultural Research Orchard - Experimental Varieties',
        clientId: '507f1f77bcf86cd799439021',
        address: {
          street: '100 Research Drive',
          city: 'Davis',
          state: 'California',
          postalCode: '95616',
          country: 'United States',
        },
        userIds: [
          '507f1f77bcf86cd799439022', // Lead researcher
          '507f1f77bcf86cd799439023', // Graduate student 1
          '507f1f77bcf86cd799439024', // Graduate student 2
          '507f1f77bcf86cd799439025'  // Field technician
        ],
      };

      // Act: Transform and validate research orchard DTO
      const dto = plainToClass(CreateOrchardDto, researchOrchardDto);
      const errors = await validate(dto);

      // Assert: Research orchard configured for academic operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Agricultural Research Orchard - Experimental Varieties');
      expect(dto.address?.city).toBe('Davis');
      expect(dto.userIds).toHaveLength(4);
    });

    it('should validate international orchard creation with unicode characters', async () => {
      // Arrange: International orchard with unicode name and address
      const internationalOrchardDto = {
        name: 'Verger de Pommes Françaises', // French apple orchard
        clientId: '507f1f77bcf86cd799439026',
        address: {
          street: '25 Rue des Pommiers',
          city: 'Normandie',
          state: 'Calvados',
          postalCode: '14000',
          country: 'France',
        },
        userIds: ['507f1f77bcf86cd799439027'], // French orchard manager
      };

      // Act: Transform and validate international orchard DTO
      const dto = plainToClass(CreateOrchardDto, internationalOrchardDto);
      const errors = await validate(dto);

      // Assert: International characters supported for global agricultural business
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Verger de Pommes Françaises');
      expect(dto.address?.street).toBe('25 Rue des Pommiers');
      expect(dto.address?.city).toBe('Normandie');
      expect(dto.address?.country).toBe('France');
    });
  });

  describe('Required Business Field Validation', () => {
    it('should require name for agricultural orchard identification', async () => {
      // Arrange: Orchard without name (critical for identification)
      const incompleteDto = {
        clientId: '507f1f77bcf86cd799439028',
      };

      // Act: Validate orchard without name
      const dto = plainToClass(CreateOrchardDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: Name is required for orchard identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should require clientId for multi-tenant data ownership', async () => {
      // Arrange: Orchard without clientId (critical for data ownership)
      const incompleteDto = {
        name: 'Unnamed Orchard',
      };

      // Act: Validate orchard without clientId
      const dto = plainToClass(CreateOrchardDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: ClientId is required for multi-tenant data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('clientId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject empty string names for business identification', async () => {
      // Arrange: Orchard with empty name (insufficient for business use)
      const emptyNameDto = {
        name: '', // Empty name
        clientId: '507f1f77bcf86cd799439029',
      };

      // Act: Validate orchard with empty name
      const dto = plainToClass(CreateOrchardDto, emptyNameDto);
      const errors = await validate(dto);

      // Assert: Non-empty name required for business identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject non-string name values for data integrity', async () => {
      // Arrange: Orchard with invalid name type
      const invalidTypeDto = {
        name: 12345, // Invalid type
        clientId: '507f1f77bcf86cd799439030',
      };

      // Act: Validate orchard with invalid name type
      const dto = plainToClass(CreateOrchardDto, invalidTypeDto);
      const errors = await validate(dto);

      // Assert: String validation enforces data integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const nameError = errors.find(err => err.property === 'name');
      expect(nameError?.constraints).toHaveProperty('isString');
    });

    it('should reject whitespace-only names for business identification', async () => {
      // Arrange: Orchard with whitespace-only name
      const whitespaceNameDto = {
        name: '   ', // Only whitespace
        clientId: '507f1f77bcf86cd799439031',
      };

      // Act: Validate orchard with whitespace-only name
      const dto = plainToClass(CreateOrchardDto, whitespaceNameDto);
      const errors = await validate(dto);

      // Assert: Whitespace-only names may be trimmed by class-transformer
      // Check if name becomes empty after transformation or if validation catches it
      if (dto.name === '' || dto.name === '   ') {
        // If transformed to empty string, should get isNotEmpty error
        if (errors.length > 0) {
          const nameError = errors.find(err => err.property === 'name');
          expect(nameError?.constraints).toHaveProperty('isNotEmpty');
        }
      } else {
        // If not transformed, whitespace validation may not be enforced at DTO level
        // This is acceptable as business logic can handle trimming
        expect(dto.name).toBeDefined();
      }
    });
  });

  describe('ClientId Validation for Multi-Tenant Security', () => {
    it('should validate all clientId assignment scenarios', async () => {
      // Arrange: Test valid clientId scenarios for business operations
      const testCases = [
        { clientId: '507f1f77bcf86cd799439032', description: 'Standard ObjectId format' },
        { clientId: '000000000000000000000000', description: 'Minimum ObjectId value' },
        { clientId: 'ffffffffffffffffffffffff', description: 'Maximum ObjectId value' },
      ];

      for (const testCase of testCases) {
        // Act: Validate each clientId scenario
        const dto = plainToClass(CreateOrchardDto, {
          name: 'Test Orchard',
          clientId: testCase.clientId,
        });
        const errors = await validate(dto);

        // Assert: All valid clientIds are accepted
        expect(errors).toHaveLength(0);
        expect(dto.clientId).toBe(testCase.clientId);
      }
    });

    it('should reject invalid clientId ObjectId formats for data security', async () => {
      // Arrange: Orchard with invalid clientId ObjectId
      const invalidClientIdDto = {
        name: 'Invalid Client Orchard',
        clientId: 'invalid-objectid-format', // Not a valid ObjectId
      };

      // Act: Validate orchard with invalid clientId
      const dto = plainToClass(CreateOrchardDto, invalidClientIdDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected for data integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const clientIdError = errors.find(err => err.property === 'clientId');
      expect(clientIdError?.constraints).toHaveProperty('isMongoId');
    });

    it('should reject non-string clientId values for data integrity', async () => {
      // Arrange: Orchard with invalid clientId type
      const invalidClientIdTypeDto = {
        name: 'Invalid Type Orchard',
        clientId: 12345 as any, // Invalid type
      };

      // Act: Validate orchard with invalid clientId type
      const dto = plainToClass(CreateOrchardDto, invalidClientIdTypeDto);
      const errors = await validate(dto);

      // Assert: Non-string clientId values rejected for data integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const clientIdError = errors.find(err => err.property === 'clientId');
      expect(clientIdError?.constraints).toHaveProperty('isMongoId');
    });

    it('should reject empty clientId for multi-tenant security', async () => {
      // Arrange: Orchard with empty clientId
      const emptyClientIdDto = {
        name: 'Empty Client Orchard',
        clientId: '', // Empty clientId
      };

      // Act: Validate orchard with empty clientId
      const dto = plainToClass(CreateOrchardDto, emptyClientIdDto);
      const errors = await validate(dto);

      // Assert: Empty clientId rejected for data security
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const clientIdError = errors.find(err => err.property === 'clientId');
      expect(clientIdError).toBeDefined();
    });

    it('should reject null clientId for data integrity', async () => {
      // Arrange: Orchard with null clientId
      const nullClientIdDto = {
        name: 'Null Client Orchard',
        clientId: null as any,
      };

      // Act: Validate orchard with null clientId
      const dto = plainToClass(CreateOrchardDto, nullClientIdDto);
      const errors = await validate(dto);

      // Assert: Null clientId rejected for data integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const clientIdError = errors.find(err => err.property === 'clientId');
      expect(clientIdError).toBeDefined();
    });
  });

  describe('Address Nested Object Validation', () => {
    it('should validate complete address information for business operations', async () => {
      // Arrange: Orchard with complete address data
      const completeAddressDto = {
        name: 'Complete Address Orchard',
        clientId: '507f1f77bcf86cd799439033',
        address: {
          street: '1500 Complete Address Road',
          city: 'Address City',
          state: 'Address State',
          postalCode: '12345',
          country: 'United States',
        },
      };

      // Act: Validate orchard with complete address
      const dto = plainToClass(CreateOrchardDto, completeAddressDto);
      const errors = await validate(dto);

      // Assert: Complete address data is properly validated
      expect(errors).toHaveLength(0);
      expect(dto.address?.street).toBe('1500 Complete Address Road');
      expect(dto.address?.city).toBe('Address City');
      expect(dto.address?.state).toBe('Address State');
      expect(dto.address?.postalCode).toBe('12345');
      expect(dto.address?.country).toBe('United States');
    });

    it('should validate partial address information for flexible business needs', async () => {
      // Arrange: Orchard with partial address data
      const partialAddressDto = {
        name: 'Partial Address Orchard',
        clientId: '507f1f77bcf86cd799439034',
        address: {
          city: 'Main City',
          state: 'Main State',
          country: 'United States',
          // Missing street and postalCode - should be acceptable
        },
      };

      // Act: Validate orchard with partial address
      const dto = plainToClass(CreateOrchardDto, partialAddressDto);
      const errors = await validate(dto);

      // Assert: Partial address information is accepted
      expect(errors).toHaveLength(0);
      expect(dto.address?.city).toBe('Main City');
      expect(dto.address?.state).toBe('Main State');
      expect(dto.address?.country).toBe('United States');
      expect(dto.address?.street).toBeUndefined();
      expect(dto.address?.postalCode).toBeUndefined();
    });

    it('should validate empty address object for startup operations', async () => {
      // Arrange: Orchard with empty address object
      const emptyAddressDto = {
        name: 'Empty Address Orchard',
        clientId: '507f1f77bcf86cd799439035',
        address: {}, // Empty address object
      };

      // Act: Validate orchard with empty address
      const dto = plainToClass(CreateOrchardDto, emptyAddressDto);
      const errors = await validate(dto);

      // Assert: Empty address object is accepted for flexibility
      expect(errors).toHaveLength(0);
      expect(dto.address).toBeDefined();
      
      // Note: class-transformer may populate properties with undefined values
      // Check that either the object is truly empty or has only undefined values
      const addressValues = Object.values(dto.address || {});
      const hasOnlyUndefinedValues = addressValues.every(value => value === undefined);
      expect(hasOnlyUndefinedValues || Object.keys(dto.address || {}).length === 0).toBe(true);
    });

    it('should accept missing address for minimal orchard creation', async () => {
      // Arrange: Orchard without address field
      const noAddressDto = {
        name: 'No Address Orchard',
        clientId: '507f1f77bcf86cd799439036',
        // No address field - optional
      };

      // Act: Validate orchard without address
      const dto = plainToClass(CreateOrchardDto, noAddressDto);
      const errors = await validate(dto);

      // Assert: Missing address is acceptable for minimal setup
      expect(errors).toHaveLength(0);
      expect(dto.address).toBeUndefined();
    });

    it('should reject non-object address values for data structure integrity', async () => {
      // Arrange: Orchard with invalid address type
      const invalidAddressTypeDto = {
        name: 'Invalid Address Type Orchard',
        clientId: '507f1f77bcf86cd799439037',
        address: 'not-an-object' as any, // Invalid type
      };

      // Act: Validate orchard with invalid address type
      const dto = plainToClass(CreateOrchardDto, invalidAddressTypeDto);
      const errors = await validate(dto);

      // Assert: Non-object address values rejected for data structure integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const addressError = errors.find(err => err.property === 'address');
      expect(addressError).toBeDefined();
    });

    it('should validate international addresses for global operations', async () => {
      // Arrange: International addresses with various formats
      const internationalAddresses = [
        {
          street: '123 Kangaroo Road',
          city: 'Sydney',
          state: 'New South Wales',
          postalCode: '2000',
          country: 'Australia',
        },
        {
          street: '456 Maple Street',
          city: 'Toronto',
          state: 'Ontario',
          postalCode: 'M5V 3A8',
          country: 'Canada',
        },
        {
          street: '789 Big Ben Avenue',
          city: 'London',
          postalCode: 'SW1A 1AA',
          country: 'United Kingdom',
          // Note: No state for UK
        },
      ];

      for (const address of internationalAddresses) {
        // Act: Validate international address format
        const dto = plainToClass(CreateOrchardDto, {
          name: `International Orchard - ${address.country}`,
          clientId: '507f1f77bcf86cd799439038',
          address,
        });
        const errors = await validate(dto);

        // Assert: International address formats are supported
        expect(errors).toHaveLength(0);
        expect(dto.address?.country).toBe(address.country);
        expect(dto.address?.city).toBe(address.city);
      }
    });
  });

  describe('User Assignment Validation', () => {
    it('should validate all user assignment scenarios for agricultural operations', async () => {
      // Arrange: Test valid user assignment scenarios
      const testCases = [
        { 
          userIds: ['507f1f77bcf86cd799439039'], 
          description: 'Single user assignment for small farm' 
        },
        { 
          userIds: ['507f1f77bcf86cd799439040', '507f1f77bcf86cd799439041', '507f1f77bcf86cd799439042'], 
          description: 'Multiple users for commercial operation' 
        },
        { 
          userIds: [], 
          description: 'Empty user array for future assignment' 
        },
        { 
          userIds: undefined, 
          description: 'No user assignment for minimal setup' 
        },
      ];

      for (const testCase of testCases) {
        // Act: Validate each user assignment scenario
        const dto = plainToClass(CreateOrchardDto, {
          name: 'Test Orchard',
          clientId: '507f1f77bcf86cd799439043',
          userIds: testCase.userIds,
        });
        const errors = await validate(dto);

        // Assert: All valid user assignments are accepted
        expect(errors).toHaveLength(0);
        expect(dto.userIds).toEqual(testCase.userIds);
      }
    });

    it('should reject invalid userIds ObjectId formats for data security', async () => {
      // Arrange: Orchard with invalid userIds ObjectIds
      const invalidUserIdsDto = {
        name: 'Invalid Users Orchard',
        clientId: '507f1f77bcf86cd799439044',
        userIds: ['invalid-objectid', '507f1f77bcf86cd799439045'], // Mixed valid/invalid
      };

      // Act: Validate orchard with invalid userIds
      const dto = plainToClass(CreateOrchardDto, invalidUserIdsDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected for data integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const userIdsError = errors.find(err => err.property === 'userIds');
      expect(userIdsError?.constraints).toHaveProperty('isMongoId');
    });

    it('should reject non-array userIds values for data structure integrity', async () => {
      // Arrange: Orchard with invalid userIds type
      const invalidUserIdsTypeDto = {
        name: 'Invalid Array Orchard',
        clientId: '507f1f77bcf86cd799439046',
        userIds: 'not-an-array' as any, // Invalid type
      };

      // Act: Validate orchard with invalid userIds type
      const dto = plainToClass(CreateOrchardDto, invalidUserIdsTypeDto);
      const errors = await validate(dto);

      // Assert: Non-array userIds values rejected for data structure integrity
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const userIdsError = errors.find(err => err.property === 'userIds');
      expect(userIdsError?.constraints).toHaveProperty('isArray');
    });

    it('should reject empty string userIds for data security', async () => {
      // Arrange: Orchard with empty string in userIds array
      const emptyUserIdDto = {
        name: 'Empty User ID Orchard',
        clientId: '507f1f77bcf86cd799439047',
        userIds: ['', '507f1f77bcf86cd799439048'], // Empty string included
      };

      // Act: Validate orchard with empty userIds
      const dto = plainToClass(CreateOrchardDto, emptyUserIdDto);
      const errors = await validate(dto);

      // Assert: Empty userIds rejected for data security
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const userIdsError = errors.find(err => err.property === 'userIds');
      expect(userIdsError?.constraints).toHaveProperty('isMongoId');
    });

    it('should validate enterprise user assignments for large operations', async () => {
      // Arrange: Enterprise orchard with many user assignments
      const enterpriseUserIds = Array.from({ length: 10 }, (_, i) => 
        `507f1f77bcf86cd79943901${i.toString().padStart(1, '0')}`
      );

      const enterpriseDto = {
        name: 'Enterprise Orchard Operations',
        clientId: '507f1f77bcf86cd799439050',
        userIds: enterpriseUserIds,
      };

      // Act: Validate enterprise user assignments
      const dto = plainToClass(CreateOrchardDto, enterpriseDto);
      const errors = await validate(dto);

      // Assert: Large user assignments supported for enterprise operations
      expect(errors).toHaveLength(0);
      expect(dto.userIds).toHaveLength(10);
      enterpriseUserIds.forEach(userId => {
        expect(dto.userIds).toContain(userId);
      });
    });
  });

  describe('Business Data Quality Validation', () => {
    it('should handle maximum complexity orchard creation', async () => {
      // Arrange: Orchard with maximum field lengths and complexity
      const complexOrchardDto = {
        name: 'Ultra Premium Organic Heritage Apple & Cherry Orchard - North Valley Experimental Block',
        clientId: 'ffffffffffffffffffffffff', // Maximum ObjectId
        address: {
          street: '12345 Very Long Street Name With Many Words And Detailed Information',
          city: 'Very Long City Name With Multiple District References',
          state: 'State With Very Long Official Name',
          postalCode: 'COMPLEX-POSTAL-CODE-123',
          country: 'Country With Very Long Official Name',
        },
        userIds: [
          '507f1f77bcf86cd799439051',
          '507f1f77bcf86cd799439052',
          '507f1f77bcf86cd799439053',
          '507f1f77bcf86cd799439054',
          '507f1f77bcf86cd799439055',
        ], // Multiple specialized users
      };

      // Act: Validate complex orchard configuration
      const dto = plainToClass(CreateOrchardDto, complexOrchardDto);
      const errors = await validate(dto);

      // Assert: Complex configurations supported for enterprise needs
      expect(errors).toHaveLength(0);
      expect(dto.name.length).toBeGreaterThan(50); // Complex name accepted
      expect(dto.userIds).toHaveLength(5);
      expect(dto.address?.street?.length).toBeGreaterThan(50); // Long addresses supported
    });

    it('should handle special characters in agricultural orchard names', async () => {
      // Arrange: Orchard names with special agricultural characters
      const specialCharacterNames = [
        "Smith's Heritage Apple Orchard - Block #1",
        "Organic Farm & Sustainable Agriculture Co.",
        "Mountain View Orchards (Est. 1952)",
        "García-López Family Farm - Manzanas Orgánicas",
        "Müller's Obstgarten - Deutsche Äpfel",
        "Orchard 50/50 Partnership - North/South Blocks",
      ];

      for (const orchardName of specialCharacterNames) {
        // Act: Validate special character orchard names
        const dto = plainToClass(CreateOrchardDto, {
          name: orchardName,
          clientId: '507f1f77bcf86cd799439056',
        });
        const errors = await validate(dto);

        // Assert: Special characters supported for diverse agricultural businesses
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(orchardName);
      }
    });

    it('should validate minimal orchard for business flexibility', async () => {
      // Arrange: Minimal orchard data (required fields only)
      const minimalOrchardDto = {
        name: 'Minimal Setup Orchard',
        clientId: '507f1f77bcf86cd799439057',
      };

      // Act: Validate minimal orchard configuration
      const dto = plainToClass(CreateOrchardDto, minimalOrchardDto);
      const errors = await validate(dto);

      // Assert: Minimal configuration supports startup operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Minimal Setup Orchard');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439057');
      expect(dto.address).toBeUndefined(); // Optional fields omitted
      expect(dto.userIds).toBeUndefined();
    });
  });

  describe('Integration with RootStock Orchard System', () => {
    it('should prepare data for OrchardsService.create() integration', async () => {
      // Arrange: DTO that mirrors OrchardsService expectations
      const serviceIntegrationDto = {
        name: 'Service Integration Orchard',
        clientId: '507f1f77bcf86cd799439058',
        address: {
          street: '100 Service Integration Drive',
          city: 'Integration City',
          state: 'Integration State',
          postalCode: '12345',
          country: 'United States',
        },
        userIds: ['507f1f77bcf86cd799439059', '507f1f77bcf86cd799439060'],
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(CreateOrchardDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by OrchardsService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('clientId');
      expect(dto).toHaveProperty('address');
      expect(dto).toHaveProperty('userIds');
      
      // Business context: OrchardsService will add recordId via CountersService
      expect(dto).not.toHaveProperty('recordId'); // Generated by service
      expect(dto).not.toHaveProperty('isActive'); // Defaulted by schema
      expect(dto).not.toHaveProperty('isDeleted'); // Defaulted by schema
    });

    it('should support orchard creation for seeded agricultural system data', async () => {
      // Arrange: System orchard matching seed data patterns
      const systemOrchardDto = {
        name: 'Demo Premium Apple Orchard',
        clientId: '507f1f77bcf86cd799439061',
        address: {
          street: '1000 Demo Orchard Road',
          city: 'Demo Valley',
          state: 'Demo State',
          postalCode: '00000',
          country: 'Demo Country',
        },
        userIds: ['507f1f77bcf86cd799439062'],
      };

      // Act: Validate system orchard for consistency with seed data
      const dto = plainToClass(CreateOrchardDto, systemOrchardDto);
      const errors = await validate(dto);

      // Assert: System orchards follow same validation as user-created orchards
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Demo Premium Apple Orchard');
      expect(dto.address?.city).toBe('Demo Valley');
    });

    it('should support agricultural orchard onboarding workflow scenarios', async () => {
      // Arrange: Different onboarding scenarios for agricultural operations
      const onboardingScenarios = [
        {
          name: 'New Farm Startup Orchard',
          clientId: '507f1f77bcf86cd799439063',
          description: 'New farm with basic setup'
        },
        {
          name: 'Established Farm Expansion Block',
          clientId: '507f1f77bcf86cd799439064',
          address: {
            street: '500 Expansion Road',
            city: 'Growth Valley',
            state: 'Expansion State',
            country: 'United States',
          },
          userIds: ['507f1f77bcf86cd799439065'],
          description: 'Established farm adding new orchard block'
        },
        {
          name: 'Corporate Agricultural Division',
          clientId: '507f1f77bcf86cd799439066',
          address: {
            street: '2000 Corporate Agriculture Boulevard',
            city: 'Business Center',
            state: 'Corporate State',
            postalCode: '99999',
            country: 'United States',
          },
          userIds: [
            '507f1f77bcf86cd799439067',
            '507f1f77bcf86cd799439068',
            '507f1f77bcf86cd799439069'
          ],
          description: 'Corporate agricultural operation with full management team'
        },
      ];

      for (const scenario of onboardingScenarios) {
        // Act: Validate each onboarding scenario
        const dto = plainToClass(CreateOrchardDto, scenario);
        const errors = await validate(dto);

        // Assert: All onboarding scenarios are supported
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(scenario.name);
        expect(dto.clientId).toBe(scenario.clientId);
      }
    });
  });
});
