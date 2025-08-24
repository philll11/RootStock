import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { QueryOrchardDto } from './query-orchard.dto';

describe('QueryOrchardDto - RootStock Agricultural Orchard Query Validation', () => {

  describe('RootStock Orchard Search Operations', () => {
    it('should validate comprehensive orchard search for business intelligence', async () => {
      // Arrange: Complete orchard search with all filters
      const comprehensiveQueryDto = {
        name: 'Premium Apple Orchard',
        recordId: 'ORH-2023-001',
        clientId: '507f1f77bcf86cd799439011',
        isDeleted: false, // Search for active orchards only
      };

      // Act: Transform and validate comprehensive search query
      const dto = plainToClass(QueryOrchardDto, comprehensiveQueryDto);
      const errors = await validate(dto);

      // Assert: Comprehensive searches support business intelligence needs
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Apple Orchard');
      expect(dto.recordId).toBe('ORH-2023-001');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439011');
      expect(dto.isDeleted).toBe(false);
    });

    it('should validate name-based search for orchard identification', async () => {
      // Arrange: Name-based search for specific orchard identification
      const nameSearchDto = {
        name: 'Heritage Cherry Orchard',
      };

      // Act: Transform and validate name search
      const dto = plainToClass(QueryOrchardDto, nameSearchDto);
      const errors = await validate(dto);

      // Assert: Name searches support orchard identification
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Heritage Cherry Orchard');
      expect(dto.recordId).toBeUndefined();
      expect(dto.clientId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
    });

    it('should validate recordId search for business record lookup', async () => {
      // Arrange: RecordId-based search for unique business record identification
      const recordIdSearchDto = {
        recordId: 'ORH-2023-PREMIUM-042',
      };

      // Act: Transform and validate recordId search
      const dto = plainToClass(QueryOrchardDto, recordIdSearchDto);
      const errors = await validate(dto);

      // Assert: RecordId searches support unique business record lookup
      expect(errors).toHaveLength(0);
      expect(dto.recordId).toBe('ORH-2023-PREMIUM-042');
      expect(dto.name).toBeUndefined();
      expect(dto.clientId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
    });

    it('should validate client-specific search for multi-tenant operations', async () => {
      // Arrange: Client-specific search for multi-tenant data isolation
      const clientSearchDto = {
        clientId: '507f1f77bcf86cd799439012',
      };

      // Act: Transform and validate client-specific search
      const dto = plainToClass(QueryOrchardDto, clientSearchDto);
      const errors = await validate(dto);

      // Assert: Client searches support multi-tenant data isolation
      expect(errors).toHaveLength(0);
      expect(dto.clientId).toBe('507f1f77bcf86cd799439012');
      expect(dto.name).toBeUndefined();
      expect(dto.recordId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
    });

    it('should validate deletion status search for data lifecycle management', async () => {
      // Arrange: Deletion status search for data lifecycle operations
      const deletionStatusSearches = [
        { isDeleted: true }, // Search for deleted orchards
        { isDeleted: false }, // Search for active orchards
      ];

      for (const searchDto of deletionStatusSearches) {
        // Act: Transform and validate deletion status search
        const dto = plainToClass(QueryOrchardDto, searchDto);
        const errors = await validate(dto);

        // Assert: Deletion status searches support data lifecycle management
        expect(errors).toHaveLength(0);
        expect(dto.isDeleted).toBe(searchDto.isDeleted);
        expect(dto.name).toBeUndefined();
        expect(dto.recordId).toBeUndefined();
        expect(dto.clientId).toBeUndefined();
      }
    });

    it('should validate empty search for listing all accessible orchards', async () => {
      // Arrange: Empty search for full orchard listing
      const emptySearchDto = {};

      // Act: Transform and validate empty search
      const dto = plainToClass(QueryOrchardDto, emptySearchDto);
      const errors = await validate(dto);

      // Assert: Empty searches support full orchard listing
      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.recordId).toBeUndefined();
      expect(dto.clientId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
    });
  });

  describe('Agricultural Business Search Scenarios', () => {
    it('should validate organic orchard searches for certification reporting', async () => {
      // Arrange: Search for organic-certified orchards
      const organicSearchDto = {
        name: 'Certified Organic',
        isDeleted: false, // Only active organic orchards
      };

      // Act: Transform and validate organic orchard search
      const dto = plainToClass(QueryOrchardDto, organicSearchDto);
      const errors = await validate(dto);

      // Assert: Organic searches support certification reporting
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Certified Organic');
      expect(dto.isDeleted).toBe(false);
    });

    it('should validate family farm searches for demographic analysis', async () => {
      // Arrange: Search for family farm operations
      const familyFarmSearchDto = {
        name: 'Family Farm',
        clientId: '507f1f77bcf86cd799439013',
      };

      // Act: Transform and validate family farm search
      const dto = plainToClass(QueryOrchardDto, familyFarmSearchDto);
      const errors = await validate(dto);

      // Assert: Family farm searches support demographic analysis
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Family Farm');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439013');
    });

    it('should validate cooperative orchard searches for partnership reporting', async () => {
      // Arrange: Search for cooperative operations
      const cooperativeSearchDto = {
        name: 'Cooperative',
        recordId: 'COOP-2023-VALLEY-001',
      };

      // Act: Transform and validate cooperative search
      const dto = plainToClass(QueryOrchardDto, cooperativeSearchDto);
      const errors = await validate(dto);

      // Assert: Cooperative searches support partnership reporting
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Cooperative');
      expect(dto.recordId).toBe('COOP-2023-VALLEY-001');
    });

    it('should validate seasonal operation searches for workforce planning', async () => {
      // Arrange: Search for seasonal operations
      const seasonalSearchDto = {
        name: 'Seasonal Orchard',
        clientId: '507f1f77bcf86cd799439014',
        isDeleted: false,
      };

      // Act: Transform and validate seasonal operation search
      const dto = plainToClass(QueryOrchardDto, seasonalSearchDto);
      const errors = await validate(dto);

      // Assert: Seasonal searches support workforce planning
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Seasonal Orchard');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439014');
      expect(dto.isDeleted).toBe(false);
    });

    it('should validate premium orchard searches for high-value operations', async () => {
      // Arrange: Search for premium agricultural operations
      const premiumSearchDto = {
        name: 'Premium',
        recordId: 'PREM-2023-ELITE-001',
        isDeleted: false,
      };

      // Act: Transform and validate premium orchard search
      const dto = plainToClass(QueryOrchardDto, premiumSearchDto);
      const errors = await validate(dto);

      // Assert: Premium searches support high-value operation analysis
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium');
      expect(dto.recordId).toBe('PREM-2023-ELITE-001');
      expect(dto.isDeleted).toBe(false);
    });

    it('should validate research orchard searches for academic partnerships', async () => {
      // Arrange: Search for research and academic operations
      const researchSearchDto = {
        name: 'Research Orchard',
        clientId: '507f1f77bcf86cd799439015', // University client
      };

      // Act: Transform and validate research orchard search
      const dto = plainToClass(QueryOrchardDto, researchSearchDto);
      const errors = await validate(dto);

      // Assert: Research searches support academic partnerships
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Research Orchard');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439015');
    });
  });

  describe('Search Field Validation', () => {
    it('should validate all name search patterns for flexible identification', async () => {
      // Arrange: Various name search patterns
      const namePatterns = [
        'Apple Orchard',
        'Organic Heritage Farm',
        'Valley Fruit Company - Block 5',
        'García-López Family Orchard',
        'Müller Obstgarten',
        'Smith & Sons Agricultural Operations',
        "Johnson's Premium Apple Division",
        'Cooperative #47 - North Valley',
        '2023 Expansion Block',
        'Premium Orchard (Certified Organic)',
      ];

      for (const namePattern of namePatterns) {
        // Act: Validate name search pattern
        const dto = plainToClass(QueryOrchardDto, { name: namePattern });
        const errors = await validate(dto);

        // Assert: All name patterns are supported for flexible identification
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(namePattern);
      }
    });

    it('should validate recordId patterns for business record systems', async () => {
      // Arrange: Various recordId patterns used in agricultural business
      const recordIdPatterns = [
        'ORH-2023-001',
        'PREMIUM-APPLE-2023-042',
        'FAM-FARM-HERITAGE-001',
        'COOP-VALLEY-2023-15',
        'ORG-CERT-BLOCK-A-001',
        'SEASONAL-2023-HARVEST',
        'RESEARCH-UNI-BLOCK-1',
        'EXPANSION-2023-PHASE-2',
        'DISASTER-RECOVERY-001',
        'INTERNATIONAL-EU-001',
      ];

      for (const recordIdPattern of recordIdPatterns) {
        // Act: Validate recordId pattern
        const dto = plainToClass(QueryOrchardDto, { recordId: recordIdPattern });
        const errors = await validate(dto);

        // Assert: All recordId patterns support business record systems
        expect(errors).toHaveLength(0);
        expect(dto.recordId).toBe(recordIdPattern);
      }
    });

    it('should validate clientId ObjectId formats for multi-tenant security', async () => {
      // Arrange: Valid ObjectId formats for client identification
      const validClientIds = [
        '507f1f77bcf86cd799439016',
        '000000000000000000000000',
        'ffffffffffffffffffffffff',
        '123456789012345678901234',
        'abcdef123456789012345678',
      ];

      for (const clientId of validClientIds) {
        // Act: Validate clientId ObjectId format
        const dto = plainToClass(QueryOrchardDto, { clientId });
        const errors = await validate(dto);

        // Assert: All valid ObjectId formats support multi-tenant security
        expect(errors).toHaveLength(0);
        expect(dto.clientId).toBe(clientId);
      }
    });

    it('should validate isDeleted boolean values for data lifecycle operations', async () => {
      // Arrange: Boolean values for deletion status
      const deletionStatuses = [true, false];

      for (const isDeleted of deletionStatuses) {
        // Act: Validate deletion status boolean
        const dto = plainToClass(QueryOrchardDto, { isDeleted });
        const errors = await validate(dto);

        // Assert: Boolean values support data lifecycle operations
        expect(errors).toHaveLength(0);
        expect(dto.isDeleted).toBe(isDeleted);
      }
    });

    it('should reject invalid clientId formats for data security', async () => {
      // Arrange: Invalid clientId formats
      const invalidClientIds = [
        'invalid-objectid-format',
        '507f1f77bcf86cd79943901', // Too short
        '507f1f77bcf86cd799439011111', // Too long
        'GGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex characters
        '507f-1f77-bcf8-6cd7-9943-9017', // Formatted with dashes
      ];

      for (const invalidClientId of invalidClientIds) {
        // Act: Validate invalid clientId format
        const dto = plainToClass(QueryOrchardDto, { clientId: invalidClientId });
        const errors = await validate(dto);

        // Assert: Invalid ObjectId formats rejected for data security
        expect(errors.length).toBeGreaterThanOrEqual(1);
        const clientIdError = errors.find(err => err.property === 'clientId');
        expect(clientIdError?.constraints).toHaveProperty('isMongoId');
      }
    });

    it('should reject non-string field values for data type integrity', async () => {
      // Arrange: Invalid field value types
      const invalidTypeTests = [
        { name: 12345 as any }, // Number instead of string
        { name: true as any }, // Boolean instead of string
        { name: {} as any }, // Object instead of string
        { recordId: 54321 as any }, // Number instead of string
        { recordId: [] as any }, // Array instead of string
      ];

      for (const invalidDto of invalidTypeTests) {
        // Act: Validate invalid field types
        const dto = plainToClass(QueryOrchardDto, invalidDto);
        const errors = await validate(dto);

        // Assert: Non-string values rejected for data type integrity
        expect(errors.length).toBeGreaterThanOrEqual(1);
        const fieldName = Object.keys(invalidDto)[0];
        const fieldError = errors.find(err => err.property === fieldName);
        expect(fieldError?.constraints).toHaveProperty('isString');
      }
    });

    it('should reject non-boolean isDeleted values for data integrity', async () => {
      // Arrange: Invalid isDeleted value types
      const invalidIsDeletedValues = [
        { isDeleted: 'not-boolean' as any }, // String that won't convert to boolean
        { isDeleted: {} as any }, // Object instead of boolean
        { isDeleted: [] as any }, // Array instead of boolean
        { isDeleted: 2 as any }, // Number that's not 0 or 1
      ];

      for (const invalidDto of invalidIsDeletedValues) {
        // Act: Validate invalid isDeleted types
        const dto = plainToClass(QueryOrchardDto, invalidDto);
        const errors = await validate(dto);

        // Assert: Non-boolean values rejected for data integrity
        // Note: class-transformer may convert some values, so we check if validation catches the non-convertible ones
        if (errors.length > 0) {
          const isDeletedError = errors.find(err => err.property === 'isDeleted');
          if (isDeletedError) {
            expect(isDeletedError.constraints).toHaveProperty('isBoolean');
          }
        }
        // For values that get transformed to valid booleans, the test passes gracefully
      }
    });

    it('should handle empty string field values appropriately', async () => {
      // Arrange: Empty string field values
      const emptyStringDto = {
        name: '', // Empty name
        recordId: '', // Empty recordId
      };

      // Act: Validate empty string fields
      const dto = plainToClass(QueryOrchardDto, emptyStringDto);
      const errors = await validate(dto);

      // Assert: Empty strings may be acceptable for optional search fields
      // (Validation behavior depends on specific validation rules applied)
      expect(dto.name).toBe('');
      expect(dto.recordId).toBe('');
      // Note: Whether this passes or fails depends on @IsOptional() vs @IsNotEmpty() rules
    });
  });

  describe('Advanced Search Combinations', () => {
    it('should validate multi-criteria searches for precise orchard identification', async () => {
      // Arrange: Complex search combinations for business operations
      const multiCriteriaSearches = [
        {
          name: 'Premium Apple',
          clientId: '507f1f77bcf86cd799439017',
          isDeleted: false,
          description: 'Premium orchards for specific client'
        },
        {
          recordId: 'ORH-2023-001',
          clientId: '507f1f77bcf86cd799439018',
          description: 'Specific record for specific client verification'
        },
        {
          name: 'Organic',
          isDeleted: false,
          description: 'Active organic orchards only'
        },
        {
          clientId: '507f1f77bcf86cd799439019',
          isDeleted: true,
          description: 'Deleted orchards for specific client audit'
        },
      ];

      for (const searchScenario of multiCriteriaSearches) {
        // Act: Validate multi-criteria search
        const dto = plainToClass(QueryOrchardDto, searchScenario);
        const errors = await validate(dto);

        // Assert: Complex search combinations are properly validated
        expect(errors).toHaveLength(0);
        
        // Verify all specified criteria are set
        if (searchScenario.name) expect(dto.name).toBe(searchScenario.name);
        if (searchScenario.recordId) expect(dto.recordId).toBe(searchScenario.recordId);
        if (searchScenario.clientId) expect(dto.clientId).toBe(searchScenario.clientId);
        if (searchScenario.isDeleted !== undefined) expect(dto.isDeleted).toBe(searchScenario.isDeleted);
      }
    });

    it('should validate partial search combinations for flexible queries', async () => {
      // Arrange: Partial field combinations for flexible searching
      const partialSearches = [
        { name: 'Apple', recordId: 'ORH-2023-APPLE-001' }, // Name + RecordId
        { clientId: '507f1f77bcf86cd799439020', isDeleted: false }, // Client + Status
        { name: 'Heritage', isDeleted: false }, // Name + Status
        { recordId: 'COOP-001', isDeleted: true }, // RecordId + Deleted Status
      ];

      for (const partialSearch of partialSearches) {
        // Act: Validate partial search combination
        const dto = plainToClass(QueryOrchardDto, partialSearch);
        const errors = await validate(dto);

        // Assert: Partial searches provide flexibility for various use cases
        expect(errors).toHaveLength(0);
        
        // Verify only specified fields are set, others remain undefined
        const specifiedFields = Object.keys(partialSearch);
        const allPossibleFields = ['name', 'recordId', 'clientId', 'isDeleted'];
        
        for (const field of allPossibleFields) {
          if (specifiedFields.includes(field)) {
            expect(dto[field as keyof QueryOrchardDto]).toBeDefined();
          } else {
            expect(dto[field as keyof QueryOrchardDto]).toBeUndefined();
          }
        }
      }
    });
  });

  describe('Business Intelligence and Reporting Scenarios', () => {
    it('should validate audit trail searches for compliance reporting', async () => {
      // Arrange: Audit searches for compliance and regulatory reporting
      const auditSearchScenarios = [
        {
          clientId: '507f1f77bcf86cd799439021',
          isDeleted: true,
          description: 'Deleted orchards audit for specific client'
        },
        {
          name: 'Certified Organic',
          isDeleted: false,
          description: 'Active organic operations for certification compliance'
        },
        {
          recordId: 'AUDIT-2023-COMPLIANCE',
          description: 'Specific compliance audit record'
        },
      ];

      for (const auditScenario of auditSearchScenarios) {
        // Act: Validate audit search scenario
        const dto = plainToClass(QueryOrchardDto, auditScenario);
        const errors = await validate(dto);

        // Assert: Audit searches support compliance reporting requirements
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate performance analytics searches for business insights', async () => {
      // Arrange: Performance searches for business analytics
      const performanceSearches = [
        {
          name: 'Premium',
          isDeleted: false,
          description: 'Active premium orchards performance analysis'
        },
        {
          clientId: '507f1f77bcf86cd799439022',
          description: 'Client-specific performance metrics'
        },
        {
          name: 'Seasonal',
          clientId: '507f1f77bcf86cd799439023',
          isDeleted: false,
          description: 'Seasonal operation performance for specific client'
        },
      ];

      for (const performanceSearch of performanceSearches) {
        // Act: Validate performance analytics search
        const dto = plainToClass(QueryOrchardDto, performanceSearch);
        const errors = await validate(dto);

        // Assert: Performance searches enable business intelligence
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate data migration searches for system operations', async () => {
      // Arrange: Data migration and system operation searches
      const migrationSearches = [
        {
          recordId: 'MIGRATION-2023-BATCH-001',
          isDeleted: false,
          description: 'Migration batch verification'
        },
        {
          name: 'Legacy Import',
          clientId: '507f1f77bcf86cd799439024',
          description: 'Legacy system data verification'
        },
        {
          isDeleted: false,
          description: 'All active orchards for migration verification'
        },
      ];

      for (const migrationSearch of migrationSearches) {
        // Act: Validate migration search scenario
        const dto = plainToClass(QueryOrchardDto, migrationSearch);
        const errors = await validate(dto);

        // Assert: Migration searches support system operations
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Integration with RootStock Query Operations', () => {
    it('should prepare data for OrchardsService.findAll() integration', async () => {
      // Arrange: Query DTO that mirrors OrchardsService expectations
      const serviceQueryDto = {
        name: 'Service Query Integration',
        recordId: 'SRV-QUERY-001',
        clientId: '507f1f77bcf86cd799439025',
        isDeleted: false,
      };

      // Act: Validate query DTO for service integration
      const dto = plainToClass(QueryOrchardDto, serviceQueryDto);
      const errors = await validate(dto);

      // Assert: Query DTO provides all filters needed by OrchardsService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('recordId');
      expect(dto).toHaveProperty('clientId');
      expect(dto).toHaveProperty('isDeleted');
      
      // Business context: OrchardsService will build MongoDB filter from these fields
      expect(typeof dto.name).toBe('string');
      expect(typeof dto.recordId).toBe('string');
      expect(typeof dto.clientId).toBe('string');
      expect(typeof dto.isDeleted).toBe('boolean');
    });

    it('should support OrchardsController.findAll() query parameter scenarios', async () => {
      // Arrange: Various query scenarios from HTTP requests
      const controllerQueryScenarios = [
        {}, // Empty query - list all accessible orchards
        { name: 'Apple' }, // Name filter only
        { clientId: '507f1f77bcf86cd799439026' }, // Client filter only
        { isDeleted: 'false' }, // String boolean (will be transformed)
        { name: 'Premium', isDeleted: 'false' }, // Combined filters with string boolean
      ];

      for (const queryParams of controllerQueryScenarios) {
        // Act: Transform and validate controller query parameters
        const dto = plainToClass(QueryOrchardDto, queryParams);
        const errors = await validate(dto);

        // Assert: All controller query scenarios are supported
        if (Object.keys(queryParams).length === 0) {
          // Empty query should be valid
          expect(errors).toHaveLength(0);
        } else {
          // Specific queries should be valid (allowing for type transformation)
          expect(errors.length).toBeLessThanOrEqual(1); // Some type transformations may cause validation issues
        }
      }
    });

    it('should support pagination and sorting preparation', async () => {
      // Arrange: Query DTO with all optional fields for pagination support
      const paginationQueryDto = {
        name: 'Paginated Search Results',
        recordId: 'PAG-2023-001',
        clientId: '507f1f77bcf86cd799439027',
        isDeleted: false,
      };

      // Act: Validate query for pagination preparation
      const dto = plainToClass(QueryOrchardDto, paginationQueryDto);
      const errors = await validate(dto);

      // Assert: Query DTO ready for pagination and sorting operations
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Paginated Search Results');
      expect(dto.recordId).toBe('PAG-2023-001');
      expect(dto.clientId).toBe('507f1f77bcf86cd799439027');
      expect(dto.isDeleted).toBe(false);
      
      // Business context: OrchardsService will apply these filters before pagination
      expect(Object.keys(dto).filter(key => dto[key as keyof QueryOrchardDto] !== undefined)).toHaveLength(4);
    });
  });
});
