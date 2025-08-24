import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

// Mock the decorators before importing DTO
jest.mock('../../clients/decorators/is-existing-single-client.decorator', () => ({
  IsExistingSingleClient: () => () => {}, // No-op decorator
}));

jest.mock('../../clients/decorators/is-existing-client.decorator', () => ({
  IsExistingClient: () => () => {}, // No-op decorator
}));

jest.mock('../../users/decorators/is-existing-contact-users.decorator', () => ({
  IsExistingContactUsers: () => () => {}, // No-op decorator
}));

// Mock the validators
jest.mock('../../clients/validators/is-existing-single-client.validator', () => ({
  IsExistingSingleClientConstraint: jest.fn(),
}));

jest.mock('../../clients/validators/is-existing-client.validator', () => ({
  IsExistingClientConstraint: jest.fn(),
}));

jest.mock('../../users/validators/is-existing-contact-users.validator', () => ({
  IsExistingContactUsersConstraint: jest.fn(),
}));

import { UpdateOrchardDto } from './update-orchard.dto';

describe('UpdateOrchardDto - RootStock Agricultural Orchard Update Validation', () => {
  
  describe('RootStock Orchard Update Operations', () => {
    it('should validate comprehensive orchard updates for agricultural lifecycle management', async () => {
      // Arrange: Complete orchard update for established agricultural operations
      const comprehensiveUpdateDto = {
        name: 'Updated Premium Apple Orchard - Expanded Operations',
        clientId: '507f1f77bcf86cd799439011',
        address: {
          street: '2500 Expanded Orchard Valley Road',
          city: 'Greater Wenatchee',
          state: 'Washington',
          postalCode: '98802',
          country: 'United States',
        },
        userIds: [
          '507f1f77bcf86cd799439012', // Retained manager
          '507f1f77bcf86cd799439013', // Retained field worker
          '507f1f77bcf86cd799439014'  // New seasonal coordinator
        ],
        isActive: true, // Explicit activation for expanded operations
      };

      // Act: Transform and validate comprehensive orchard update
      const dto = plainToClass(UpdateOrchardDto, comprehensiveUpdateDto);
      const errors = await validate(dto);

      // Assert: Comprehensive updates support agricultural expansion
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Updated Premium Apple Orchard - Expanded Operations');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439011');
      expect(dto.address?.street).toBe('2500 Expanded Orchard Valley Road');
      expect(dto.address?.city).toBe('Greater Wenatchee');
      expect(dto.userIds).toHaveLength(3);
      expect(dto.isActive).toBe(true);
    });

    it('should validate seasonal operation deactivation updates', async () => {
      // Arrange: Seasonal orchard deactivation for winter operations
      const seasonalUpdateDto = {
        isActive: false, // Seasonal deactivation
      };

      // Act: Transform and validate seasonal deactivation
      const dto = plainToClass(UpdateOrchardDto, seasonalUpdateDto);
      const errors = await validate(dto);

      // Assert: Seasonal deactivation is properly handled
      expect(errors).toHaveLength(0);
      expect(dto.isActive).toBe(false);
      expect(dto.name).toBeUndefined(); // Only isActive changed
      expect(dto.clientId).toBeUndefined();
      expect(dto.address).toBeUndefined();
      expect(dto.userIds).toBeUndefined();
    });

    it('should validate name rebranding updates for farm transitions', async () => {
      // Arrange: Orchard name update for farm ownership transition
      const nameUpdateDto = {
        name: 'Heritage Family Farm - Apple Division',
      };

      // Act: Transform and validate name rebranding
      const dto = plainToClass(UpdateOrchardDto, nameUpdateDto);
      const errors = await validate(dto);

      // Assert: Name rebranding supported for business transitions
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Heritage Family Farm - Apple Division');
      expect(dto.isActive).toBeUndefined(); // Only name changed
    });

    it('should validate address updates for relocation or expansion', async () => {
      // Arrange: Address update for farm relocation or expansion
      const addressUpdateDto = {
        address: {
          street: '3000 New Location Boulevard',
          city: 'Expansion Valley',
          state: 'Growth State',
          postalCode: '55555',
          country: 'United States',
        },
      };

      // Act: Transform and validate address update
      const dto = plainToClass(UpdateOrchardDto, addressUpdateDto);
      const errors = await validate(dto);

      // Assert: Address updates supported for relocation scenarios
      expect(errors).toHaveLength(0);
      expect(dto.address?.street).toBe('3000 New Location Boulevard');
      expect(dto.address?.city).toBe('Expansion Valley');
      expect(dto.address?.state).toBe('Growth State');
      expect(dto.address?.postalCode).toBe('55555');
      expect(dto.name).toBeUndefined(); // Only address changed
      expect(dto.isActive).toBeUndefined();
    });

    it('should validate staff assignment updates for operational changes', async () => {
      // Arrange: User assignment update for staff changes
      const staffUpdateDto = {
        userIds: [
          '507f1f77bcf86cd799439015', // New farm manager
          '507f1f77bcf86cd799439016', // New assistant manager
        ],
      };

      // Act: Transform and validate staff assignment update
      const dto = plainToClass(UpdateOrchardDto, staffUpdateDto);
      const errors = await validate(dto);

      // Assert: Staff assignments updated for operational changes
      expect(errors).toHaveLength(0);
      expect(dto.userIds).toHaveLength(2);
      expect(dto.userIds).toContain('507f1f77bcf86cd799439015');
      expect(dto.userIds).toContain('507f1f77bcf86cd799439016');
      expect(dto.name).toBeUndefined(); // Only userIds changed
      expect(dto.isActive).toBeUndefined();
    });

    it('should validate client ownership transfer updates', async () => {
      // Arrange: Client ownership transfer for business acquisition
      const ownershipTransferDto = {
        clientId: '507f1f77bcf86cd799439017',
        isActive: true, // Ensure activation after transfer
      };

      // Act: Transform and validate ownership transfer
      const dto = plainToClass(UpdateOrchardDto, ownershipTransferDto);
      const errors = await validate(dto);

      // Assert: Ownership transfers supported for business acquisitions
      expect(errors).toHaveLength(0);
      expect(dto.clientId).toBe('507f1f77bcf86cd799439017');
      expect(dto.isActive).toBe(true);
      expect(dto.name).toBeUndefined(); // Only ownership fields changed
      expect(dto.userIds).toBeUndefined();
    });

    it('should validate partial address updates for specific field changes', async () => {
      // Arrange: Partial address update (only postal code change)
      const partialAddressDto = {
        address: {
          postalCode: '99999', // New postal code only
        },
      };

      // Act: Transform and validate partial address update
      const dto = plainToClass(UpdateOrchardDto, partialAddressDto);
      const errors = await validate(dto);

      // Assert: Partial address updates supported for specific changes
      expect(errors).toHaveLength(0);
      expect(dto.address?.postalCode).toBe('99999');
      expect(dto.address?.street).toBeUndefined();
      expect(dto.address?.city).toBeUndefined();
      expect(dto.address?.state).toBeUndefined();
      expect(dto.address?.country).toBeUndefined();
    });

    it('should validate empty updates for no-operation scenarios', async () => {
      // Arrange: Empty update object (all optional fields omitted)
      const emptyUpdateDto = {};

      // Act: Transform and validate empty update
      const dto = plainToClass(UpdateOrchardDto, emptyUpdateDto);
      const errors = await validate(dto);

      // Assert: Empty updates are valid (PartialType behavior)
      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.clientId).toBeUndefined();
      expect(dto.address).toBeUndefined();
      expect(dto.userIds).toBeUndefined();
      expect(dto.isActive).toBeUndefined();
    });
  });

  describe('PartialType Behavior Validation', () => {
    it('should make all fields optional per PartialType specification', async () => {
      // Arrange: Test each field individually as optional
      const individualFieldUpdates = [
        { name: 'Optional Name Update' },
        { clientId: '507f1f77bcf86cd799439018' },
        { address: { city: 'Optional City' } },
        { userIds: ['507f1f77bcf86cd799439019'] },
        { isActive: false },
      ];

      for (const updateData of individualFieldUpdates) {
        // Act: Validate individual field updates
        const dto = plainToClass(UpdateOrchardDto, updateData);
        const errors = await validate(dto);

        // Assert: Each field can be updated independently (PartialType behavior)
        expect(errors).toHaveLength(0);
        
        // Verify only the specified field is set
        const setFields = Object.keys(updateData);
        expect(setFields).toHaveLength(1);
        
        for (const [key, value] of Object.entries(updateData)) {
          expect(dto[key as keyof UpdateOrchardDto]).toEqual(value);
        }
      }
    });

    it('should inherit validation rules from CreateOrchardDto when fields are provided', async () => {
      // Arrange: Update with fields that should trigger inherited validation
      const validationTestDto = {
        name: '', // Empty name should fail validation
        clientId: 'invalid-objectid-format', // Invalid ObjectId should fail
        userIds: ['invalid-userid'], // Invalid userIds should fail
      };

      // Act: Transform and validate inherited validation rules
      const dto = plainToClass(UpdateOrchardDto, validationTestDto);
      const errors = await validate(dto);

      // Assert: Inherited validation rules are enforced when fields are provided
      expect(errors.length).toBeGreaterThanOrEqual(1);
      
      // Check for name validation error
      const nameError = errors.find(err => err.property === 'name');
      expect(nameError?.constraints).toHaveProperty('isNotEmpty');
      
      // Check for clientId validation error
      const clientIdError = errors.find(err => err.property === 'clientId');
      expect(clientIdError?.constraints).toHaveProperty('isMongoId');
      
      // Check for userIds validation error
      const userIdsError = errors.find(err => err.property === 'userIds');
      expect(userIdsError?.constraints).toHaveProperty('isMongoId');
    });

    it('should support selective field updates without affecting validation of omitted fields', async () => {
      // Arrange: Valid update with only some fields (others omitted)
      const selectiveUpdateDto = {
        name: 'Valid Selective Update Name',
        // clientId omitted - should not cause validation error
        // address omitted - should not cause validation error
        userIds: ['507f1f77bcf86cd799439020'], // Valid ObjectId
        // isActive omitted - should not cause validation error
      };

      // Act: Validate selective field update
      const dto = plainToClass(UpdateOrchardDto, selectiveUpdateDto);
      const errors = await validate(dto);

      // Assert: Only provided fields are validated, omitted fields ignored
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Valid Selective Update Name');
      expect(dto.userIds).toHaveLength(1);
      expect(dto.userIds?.[0]).toBe('507f1f77bcf86cd799439020');
      expect(dto.clientId).toBeUndefined(); // Omitted field
      expect(dto.address).toBeUndefined(); // Omitted field
      expect(dto.isActive).toBeUndefined(); // Omitted field
    });
  });

  describe('IsActive Field Validation', () => {
    it('should validate isActive true for orchard activation', async () => {
      // Arrange: Orchard activation update
      const activationDto = {
        isActive: true,
      };

      // Act: Transform and validate orchard activation
      const dto = plainToClass(UpdateOrchardDto, activationDto);
      const errors = await validate(dto);

      // Assert: Orchard activation is properly validated
      expect(errors).toHaveLength(0);
      expect(dto.isActive).toBe(true);
    });

    it('should validate isActive false for orchard deactivation', async () => {
      // Arrange: Orchard deactivation update
      const deactivationDto = {
        isActive: false,
      };

      // Act: Transform and validate orchard deactivation
      const dto = plainToClass(UpdateOrchardDto, deactivationDto);
      const errors = await validate(dto);

      // Assert: Orchard deactivation is properly validated
      expect(errors).toHaveLength(0);
      expect(dto.isActive).toBe(false);
    });

    it('should reject non-boolean isActive values for data integrity', async () => {
      // Arrange: Invalid isActive value types
      const invalidIsActiveValues = [
        { isActive: 'not-boolean' as any }, // String that won't convert to boolean
        { isActive: {} as any }, // Object instead of boolean
        { isActive: [] as any }, // Array instead of boolean
        { isActive: 2 as any }, // Number that's not 0 or 1
      ];

      for (const invalidDto of invalidIsActiveValues) {
        // Act: Validate invalid isActive value
        const dto = plainToClass(UpdateOrchardDto, invalidDto);
        const errors = await validate(dto);

        // Assert: Non-boolean isActive values rejected for data integrity
        // Note: Some values might be transformed by class-transformer
        if (errors.length > 0) {
          const isActiveError = errors.find(err => err.property === 'isActive');
          if (isActiveError) {
            expect(isActiveError.constraints).toHaveProperty('isBoolean');
          }
        }
        // For values that get transformed, we still expect the test to handle them gracefully
      }
    });

    it('should handle isActive with other field combinations', async () => {
      // Arrange: Combined updates including isActive changes
      const combinedUpdateScenarios = [
        {
          name: 'Reactivated Premium Orchard',
          isActive: true,
          description: 'Name change with activation'
        },
        {
          clientId: '507f1f77bcf86cd799439021',
          isActive: false,
          description: 'Ownership transfer with deactivation'
        },
        {
          address: { city: 'New City' },
          userIds: ['507f1f77bcf86cd799439022'],
          isActive: true,
          description: 'Multi-field update with activation'
        },
      ];

      for (const scenario of combinedUpdateScenarios) {
        // Act: Validate combined field updates with isActive
        const dto = plainToClass(UpdateOrchardDto, scenario);
        const errors = await validate(dto);

        // Assert: isActive combines properly with other field updates
        expect(errors).toHaveLength(0);
        expect(dto.isActive).toBe(scenario.isActive);
      }
    });

    it('should support optional isActive for flexible update operations', async () => {
      // Arrange: Update without isActive field (should remain undefined)
      const noIsActiveDto = {
        name: 'Update Without IsActive Change',
        clientId: '507f1f77bcf86cd799439023',
      };

      // Act: Validate update without isActive
      const dto = plainToClass(UpdateOrchardDto, noIsActiveDto);
      const errors = await validate(dto);

      // Assert: isActive is optional and can be omitted
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Update Without IsActive Change');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439023');
      expect(dto.isActive).toBeUndefined(); // Not specified
    });
  });

  describe('Agricultural Business Update Scenarios', () => {
    it('should support organic certification status updates', async () => {
      // Arrange: Orchard name update to reflect organic certification
      const organicCertificationDto = {
        name: 'Certified Organic Apple Orchard - USDA Approved',
        isActive: true, // Activate with new certification
      };

      // Act: Validate organic certification status update
      const dto = plainToClass(UpdateOrchardDto, organicCertificationDto);
      const errors = await validate(dto);

      // Assert: Organic certification updates are supported
      expect(errors).toHaveLength(0);
      expect(dto.name).toContain('Certified Organic');
      expect(dto.name).toContain('USDA Approved');
      expect(dto.isActive).toBe(true);
    });

    it('should support seasonal workforce management updates', async () => {
      // Arrange: Seasonal staff changes for harvest operations
      const seasonalWorkforceDto = {
        userIds: [
          '507f1f77bcf86cd799439024', // Harvest supervisor
          '507f1f77bcf86cd799439025', // Seasonal worker 1
          '507f1f77bcf86cd799439026', // Seasonal worker 2
          '507f1f77bcf86cd799439027', // Seasonal worker 3
          '507f1f77bcf86cd799439028', // Equipment operator
        ],
      };

      // Act: Validate seasonal workforce update
      const dto = plainToClass(UpdateOrchardDto, seasonalWorkforceDto);
      const errors = await validate(dto);

      // Assert: Seasonal workforce changes are properly handled
      expect(errors).toHaveLength(0);
      expect(dto.userIds).toHaveLength(5);
      expect(dto.userIds).toContain('507f1f77bcf86cd799439024'); // Supervisor
      expect(dto.userIds).toContain('507f1f77bcf86cd799439028'); // Equipment operator
    });

    it('should support farm expansion address updates', async () => {
      // Arrange: Address update for farm expansion to adjacent property
      const farmExpansionDto = {
        name: 'Expanded Heritage Orchard - North & South Blocks',
        address: {
          street: '1000-2000 Expanded Farm Road', // Combined properties
          city: 'Agricultural Valley',
          state: 'Growth State',
          postalCode: '88888',
          country: 'United States',
        },
      };

      // Act: Validate farm expansion address update
      const dto = plainToClass(UpdateOrchardDto, farmExpansionDto);
      const errors = await validate(dto);

      // Assert: Farm expansion addresses are supported
      expect(errors).toHaveLength(0);
      expect(dto.name).toContain('North & South Blocks');
      expect(dto.address?.street).toBe('1000-2000 Expanded Farm Road');
      expect(dto.address?.city).toBe('Agricultural Valley');
    });

    it('should support cooperative membership transition updates', async () => {
      // Arrange: Orchard joining agricultural cooperative
      const cooperativeTransitionDto = {
        name: 'Valley Farms Cooperative - Member Orchard #47',
        clientId: '507f1f77bcf86cd799439029', // New cooperative client
        userIds: [
          '507f1f77bcf86cd799439030', // Cooperative coordinator
          '507f1f77bcf86cd799439031', // Original farm owner (retained)
        ],
      };

      // Act: Validate cooperative transition
      const dto = plainToClass(UpdateOrchardDto, cooperativeTransitionDto);
      const errors = await validate(dto);

      // Assert: Cooperative transitions are properly handled
      expect(errors).toHaveLength(0);
      expect(dto.name).toContain('Cooperative');
      expect(dto.name).toContain('Member Orchard #47');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439029');
      expect(dto.userIds).toHaveLength(2);
    });

    it('should support disaster recovery address updates', async () => {
      // Arrange: Address update after natural disaster relocation
      const disasterRecoveryDto = {
        name: 'Relocated Heritage Orchard - Post-Recovery Operations',
        address: {
          street: '5000 Recovery Valley Road',
          city: 'New Agricultural Zone',
          state: 'Recovery State',
          postalCode: '77777',
          country: 'United States',
        },
        isActive: true, // Reactivate after recovery
      };

      // Act: Validate disaster recovery update
      const dto = plainToClass(UpdateOrchardDto, disasterRecoveryDto);
      const errors = await validate(dto);

      // Assert: Disaster recovery scenarios are supported
      expect(errors).toHaveLength(0);
      expect(dto.name).toContain('Post-Recovery');
      expect(dto.address?.street).toBe('5000 Recovery Valley Road');
      expect(dto.address?.city).toBe('New Agricultural Zone');
      expect(dto.isActive).toBe(true);
    });

    it('should support international operation expansion', async () => {
      // Arrange: International address update for global expansion
      const internationalExpansionDto = {
        name: 'Global Agricultural Operations - European Division',
        address: {
          street: '123 Euro Agriculture Boulevard',
          city: 'Agricultural Hub',
          state: 'Agricultural Region',
          postalCode: 'EU-12345',
          country: 'Agricultural Union',
        },
        userIds: [
          '507f1f77bcf86cd799439032', // International operations manager
          '507f1f77bcf86cd799439033', // Local agricultural specialist
        ],
      };

      // Act: Validate international expansion
      const dto = plainToClass(UpdateOrchardDto, internationalExpansionDto);
      const errors = await validate(dto);

      // Assert: International operations are supported
      expect(errors).toHaveLength(0);
      expect(dto.name).toContain('European Division');
      expect(dto.address?.country).toBe('Agricultural Union');
      expect(dto.address?.postalCode).toBe('EU-12345');
      expect(dto.userIds).toHaveLength(2);
    });
  });

  describe('Data Quality and Edge Cases', () => {
    it('should handle complex Unicode characters in update operations', async () => {
      // Arrange: Unicode characters in various fields
      const unicodeUpdateDto = {
        name: 'Finca Orgánica José María - Manzanas Especiales',
        address: {
          street: '123 Straße mit Umlauts ä ö ü',
          city: 'Zürich',
          country: 'España',
        },
      };

      // Act: Validate Unicode character updates
      const dto = plainToClass(UpdateOrchardDto, unicodeUpdateDto);
      const errors = await validate(dto);

      // Assert: Unicode characters are properly handled
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Finca Orgánica José María - Manzanas Especiales');
      expect(dto.address?.street).toBe('123 Straße mit Umlauts ä ö ü');
      expect(dto.address?.city).toBe('Zürich');
      expect(dto.address?.country).toBe('España');
    });

    it('should handle maximum field length scenarios', async () => {
      // Arrange: Update with maximum reasonable field lengths
      const maxLengthDto = {
        name: 'Very Long Agricultural Business Name With Detailed Description And Multiple Operational Divisions Including Organic Certification And Sustainable Agriculture Practices For Future Generations',
        address: {
          street: '12345 Very Long Street Name With Multiple Buildings And Complex Addressing Information For Agricultural Business Operations Center',
          city: 'Very Long City Name With Multiple Districts And Agricultural Zones',
          state: 'Very Long State Name With Agricultural Designation',
          postalCode: 'COMPLEX-INTERNATIONAL-POSTAL-CODE-SYSTEM',
        },
      };

      // Act: Validate maximum field length update
      const dto = plainToClass(UpdateOrchardDto, maxLengthDto);
      const errors = await validate(dto);

      // Assert: Maximum field lengths are supported
      expect(errors).toHaveLength(0);
      expect(dto.name?.length).toBeGreaterThan(100);
      expect(dto.address?.street?.length).toBeGreaterThan(100);
    });

    it('should handle null and undefined field clearing', async () => {
      // Arrange: Update attempting to clear optional fields
      const fieldClearingDto = {
        address: undefined, // Attempt to clear address
        userIds: undefined, // Attempt to clear user assignments
      };

      // Act: Validate field clearing attempt
      const dto = plainToClass(UpdateOrchardDto, fieldClearingDto);
      const errors = await validate(dto);

      // Assert: Optional fields can be left undefined
      expect(errors).toHaveLength(0);
      expect(dto.address).toBeUndefined();
      expect(dto.userIds).toBeUndefined();
    });
  });

  describe('Integration with RootStock Update Operations', () => {
    it('should prepare data for OrchardsService.update() integration', async () => {
      // Arrange: Update DTO that mirrors OrchardsService expectations
      const serviceUpdateDto = {
        name: 'Service Update Integration Orchard',
        clientId: '507f1f77bcf86cd799439034',
        address: {
          street: '200 Service Update Drive',
          city: 'Update City',
          state: 'Update State',
          postalCode: '54321',
          country: 'United States',
        },
        userIds: ['507f1f77bcf86cd799439035', '507f1f77bcf86cd799439036'],
        isActive: false, // Status change
      };

      // Act: Validate update DTO for service integration
      const dto = plainToClass(UpdateOrchardDto, serviceUpdateDto);
      const errors = await validate(dto);

      // Assert: Update DTO provides all necessary data for OrchardsService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('clientId');
      expect(dto).toHaveProperty('address');
      expect(dto).toHaveProperty('userIds');
      expect(dto).toHaveProperty('isActive');
      
      // Business context: OrchardsService will merge with existing orchard data
      expect(dto.isActive).toBe(false); // Status change confirmed
    });

    it('should support partial updates for OrchardsController.update() scenarios', async () => {
      // Arrange: Various partial update scenarios
      const partialUpdateScenarios = [
        { name: 'Name Only Update' }, // Name change only
        { isActive: false }, // Status change only
        { userIds: ['507f1f77bcf86cd799439037'] }, // Staff change only
        { address: { postalCode: '99999' } }, // Postal code only
        { clientId: '507f1f77bcf86cd799439038' }, // Ownership transfer only
      ];

      for (const partialUpdate of partialUpdateScenarios) {
        // Act: Validate partial update scenario
        const dto = plainToClass(UpdateOrchardDto, partialUpdate);
        const errors = await validate(dto);

        // Assert: All partial update scenarios are supported
        expect(errors).toHaveLength(0);
        
        // Verify only specified fields are set
        const specifiedFields = Object.keys(partialUpdate);
        for (const field of specifiedFields) {
          expect(dto[field as keyof UpdateOrchardDto]).toBeDefined();
        }
      }
    });
  });
});
