// backend/src/users/dto/query-user.dto.spec.ts
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryUserDto } from './query-user.dto';
import { UserType } from '../schemas/user.schema';

describe('QueryUserDto - RootStock Agricultural User Query Validation', () => {

  describe('Agricultural User Search Scenarios', () => {
    it('should validate consultant search by recordId', async () => {
      // Arrange: Search for specific agricultural consultant by recordId
      const consultantSearchDto = {
        recordId: 'SENIOR_AGRICULTURAL_CONSULTANT',
      };

      // Act: Transform and validate consultant search
      const dto = plainToClass(QueryUserDto, consultantSearchDto);
      const errors = await validate(dto);

      // Assert: RecordId search supported for precise user identification
      expect(errors).toHaveLength(0);
      expect(dto.recordId).toBe('SENIOR_AGRICULTURAL_CONSULTANT');
    });

    it('should validate user search by email address', async () => {
      // Arrange: Search for specific user by email address (authentication lookup)
      const emailSearchDto = {
        email: 'consultant@orchards.com',
      };

      // Act: Transform and validate email search
      const dto = plainToClass(QueryUserDto, emailSearchDto);
      const errors = await validate(dto);

      // Assert: Email search supported for authentication and user lookup
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('consultant@orchards.com');
    });

    it('should validate farm owner search by name pattern', async () => {
      // Arrange: Search for farm owners by name pattern
      const nameSearchDto = {
        name: 'Smith Family Farm',
        userType: UserType.CONTACT,
      };

      // Act: Validate name-based farm owner search
      const dto = plainToClass(QueryUserDto, nameSearchDto);
      const errors = await validate(dto);

      // Assert: Name pattern search supported for farm owner identification
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Smith Family Farm');
      expect(dto.userType).toBe(UserType.CONTACT);
    });

    it('should validate employee consultant search with active status', async () => {
      // Arrange: Search for active employee consultants
      const activeEmployeeSearchDto = {
        userType: UserType.EMPLOYEE,
        includeInactives: false, // Only active consultants
      };

      // Act: Validate active employee search
      const dto = plainToClass(QueryUserDto, activeEmployeeSearchDto);
      const errors = await validate(dto);

      // Assert: Active employee filtering supported for workforce management
      expect(errors).toHaveLength(0);
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.includeInactives).toBe(false);
    });

    it('should validate seasonal worker search including inactive users', async () => {
      // Arrange: Search for all seasonal workers including inactive ones
      const seasonalSearchDto = {
        name: 'Seasonal',
        includeInactives: true, // Include off-season workers
      };

      // Act: Validate seasonal worker comprehensive search
      const dto = plainToClass(QueryUserDto, seasonalSearchDto);
      const errors = await validate(dto);

      // Assert: Comprehensive seasonal worker search supported
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Seasonal');
      expect(dto.includeInactives).toBe(true);
    });

    it('should validate archived user search for compliance', async () => {
      // Arrange: Search for archived/deleted users for compliance reporting
      const archivedSearchDto = {
        isDeleted: true, // Search in archived users
        userType: UserType.CONTACT,
      };

      // Act: Validate archived user search
      const dto = plainToClass(QueryUserDto, archivedSearchDto);
      const errors = await validate(dto);

      // Assert: Archived user search supported for compliance needs
      expect(errors).toHaveLength(0);
      expect(dto.isDeleted).toBe(true);
      expect(dto.userType).toBe(UserType.CONTACT);
    });
  });

  describe('Business User Type Query Validation', () => {
    it('should validate all agricultural user type searches', async () => {
      // Arrange: Test searches for all valid user types
      const userTypeSearches = [
        { userType: UserType.EMPLOYEE, description: 'Search for consultant employees' },
        { userType: UserType.CONTACT, description: 'Search for farm owner contacts' },
      ];

      for (const search of userTypeSearches) {
        // Act: Validate user type search
        const dto = plainToClass(QueryUserDto, {
          userType: search.userType,
        });
        const errors = await validate(dto);

        // Assert: All user type searches supported for business operations
        expect(errors).toHaveLength(0);
        expect(dto.userType).toBe(search.userType);
      }
    });

    it('should reject invalid userType values for data security', async () => {
      // Arrange: Query with invalid userType (security risk)
      const invalidUserTypeDto = {
        userType: 'invalid-type' as any, // Not a valid enum value
      };

      // Act: Validate query with invalid userType
      const dto = plainToClass(QueryUserDto, invalidUserTypeDto);
      const errors = await validate(dto);

      // Assert: Invalid userTypes rejected to prevent unauthorized access
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userType');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });
  });

  describe('Record Identification Query Validation', () => {
    it('should validate business recordId search patterns', async () => {
      // Arrange: Test various recordId patterns used in agricultural business
      const recordIdSearches = [
        { recordId: 'PREMIUM_ORCHARD_CLIENT_OWNER', description: 'Premium client owner search' },
        { recordId: 'CONSULTANT_MULTI_CLIENT', description: 'Multi-client consultant search' },
        { recordId: 'SEASONAL_HARVEST_WORKER', description: 'Seasonal worker search' },
        { recordId: 'ADMIN_SUPER_USER', description: 'Administrative user search' },
      ];

      for (const search of recordIdSearches) {
        // Act: Validate recordId search
        const dto = plainToClass(QueryUserDto, {
          recordId: search.recordId,
        });
        const errors = await validate(dto);

        // Assert: Business recordId searches supported
        expect(errors).toHaveLength(0);
        expect(dto.recordId).toBe(search.recordId);
      }
    });

    it('should reject non-string recordId values for data integrity', async () => {
      // Arrange: Query with invalid recordId type
      const invalidRecordIdDto = {
        recordId: 12345 as any, // Invalid type
      };

      // Act: Validate query with invalid recordId type
      const dto = plainToClass(QueryUserDto, invalidRecordIdDto);
      const errors = await validate(dto);

      // Assert: Non-string recordId values rejected for data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('recordId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('Name-Based Search Query Validation', () => {
    it('should validate agricultural business name searches', async () => {
      // Arrange: Test name search patterns for agricultural users
      const nameSearches = [
        { name: 'Agricultural Consulting Services', description: 'Business name search' },
        { name: 'Smith Family Orchard', description: 'Family farm search' },
        { name: 'María García-López', description: 'International name search' },
        { name: 'Premium Orchards Corp', description: 'Corporate entity search' },
        { name: 'Seasonal Worker Team', description: 'Worker group search' },
      ];

      for (const search of nameSearches) {
        // Act: Validate name-based search
        const dto = plainToClass(QueryUserDto, {
          name: search.name,
        });
        const errors = await validate(dto);

        // Assert: Agricultural business name searches supported
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(search.name);
      }
    });

    it('should reject non-string name values for data integrity', async () => {
      // Arrange: Query with invalid name type
      const invalidNameDto = {
        name: true as any, // Invalid type
      };

      // Act: Validate query with invalid name type
      const dto = plainToClass(QueryUserDto, invalidNameDto);
      const errors = await validate(dto);

      // Assert: Non-string name values rejected for data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('Email-Based User Query Validation', () => {
    it('should support user lookup by email for authentication workflows', async () => {
      // Arrange: Email-based user lookup for login/authentication
      const emailLookupDto = {
        email: 'consultant@orchards.com',
      };

      // Act: Validate email lookup query
      const dto = plainToClass(QueryUserDto, emailLookupDto);
      const errors = await validate(dto);

      // Assert: Email lookups supported for authentication workflows
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('consultant@orchards.com');
    });

    it('should support combined email and user type queries', async () => {
      // Arrange: Combined email and user type search for precise identification
      const combinedQueryDto = {
        email: 'farm.owner@orchards.com',
        userType: UserType.CONTACT,
      };

      // Act: Validate combined email and user type query
      const dto = plainToClass(QueryUserDto, combinedQueryDto);
      const errors = await validate(dto);

      // Assert: Combined queries supported for precise user identification
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('farm.owner@orchards.com');
      expect(dto.userType).toBe(UserType.CONTACT);
    });

    it('should support email-based queries with status filtering', async () => {
      // Arrange: Email query with status filtering for user management
      const emailStatusQueryDto = {
        email: 'seasonal.user@orchards.com',
        includeInactives: true,
      };

      // Act: Validate email query with status filtering
      const dto = plainToClass(QueryUserDto, emailStatusQueryDto);
      const errors = await validate(dto);

      // Assert: Email queries with status filtering supported
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('seasonal.user@orchards.com');
      expect(dto.includeInactives).toBe(true);
    });

    it('should support comprehensive queries including email', async () => {
      // Arrange: Comprehensive query with email and multiple filters
      const comprehensiveQueryDto = {
        email: 'specific.user@orchards.com',
        name: 'Specific User Name',
        userType: UserType.EMPLOYEE,
        includeInactives: false,
        isDeleted: false,
      };

      // Act: Validate comprehensive query with email
      const dto = plainToClass(QueryUserDto, comprehensiveQueryDto);
      const errors = await validate(dto);

      // Assert: Comprehensive queries including email are supported
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('specific.user@orchards.com');
      expect(dto.name).toBe('Specific User Name');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.includeInactives).toBe(false);
      expect(dto.isDeleted).toBe(false);
    });

    it('should support optional email in queries', async () => {
      // Arrange: Query without email (general search)
      const nonEmailQueryDto = {
        name: 'General Search',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate query without email
      const dto = plainToClass(QueryUserDto, nonEmailQueryDto);
      const errors = await validate(dto);

      // Assert: Email is optional in queries (general searches supported)
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('General Search');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.email).toBeUndefined(); // Email not specified
    });
  });

  describe('Business Data Status Query Management', () => {
    it('should validate active user filtering for operational queries', async () => {
      // Arrange: Test active user filtering scenarios
      const activeFilteringScenarios = [
        { 
          includeInactives: false, 
          description: 'Exclude inactive users for operational dashboard',
          context: 'Daily operations view'
        },
        { 
          includeInactives: true, 
          description: 'Include inactive users for comprehensive reporting',
          context: 'HR audit or seasonal planning'
        },
      ];

      for (const scenario of activeFilteringScenarios) {
        // Act: Validate active user filtering
        const dto = plainToClass(QueryUserDto, {
          includeInactives: scenario.includeInactives,
        });
        const errors = await validate(dto);

        // Assert: Active user filtering supported for business operations
        expect(errors).toHaveLength(0);
        expect(dto.includeInactives).toBe(scenario.includeInactives);
      }
    });

    it('should validate deleted user query for compliance management', async () => {
      // Arrange: Test deleted user query scenarios
      const deletedQueryScenarios = [
        { 
          isDeleted: false, 
          description: 'Query active user records',
          context: 'Standard business operations'
        },
        { 
          isDeleted: true, 
          description: 'Query archived user records',
          context: 'Compliance audit or data recovery'
        },
      ];

      for (const scenario of deletedQueryScenarios) {
        // Act: Validate deleted user query
        const dto = plainToClass(QueryUserDto, {
          isDeleted: scenario.isDeleted,
        });
        const errors = await validate(dto);

        // Assert: Deleted user queries supported for compliance management
        expect(errors).toHaveLength(0);
        expect(dto.isDeleted).toBe(scenario.isDeleted);
      }
    });
  });

  describe('Comprehensive Agricultural User Query Scenarios', () => {
    it('should validate complex multi-criteria user searches', async () => {
      // Arrange: Complex search scenarios for agricultural business operations
      const complexSearchScenarios = [
        {
          description: 'Active employee consultants search',
          query: {
            userType: UserType.EMPLOYEE,
            includeInactives: false,
            isDeleted: false,
          }
        },
        {
          description: 'Comprehensive farm owner search',
          query: {
            name: 'Premium Orchards',
            userType: UserType.CONTACT,
            includeInactives: true,
          }
        },
        {
          description: 'Archived consultant records search',
          query: {
            userType: UserType.EMPLOYEE,
            isDeleted: true,
          }
        },
        {
          description: 'Specific user record lookup',
          query: {
            recordId: 'SPECIFIC_CONSULTANT_RECORD',
            includeInactives: true,
            isDeleted: false,
          }
        },
      ];

      for (const scenario of complexSearchScenarios) {
        // Act: Validate complex multi-criteria search
        const dto = plainToClass(QueryUserDto, scenario.query);
        const errors = await validate(dto);

        // Assert: Complex searches supported for comprehensive user management
        expect(errors).toHaveLength(0);
        Object.keys(scenario.query).forEach(key => {
          expect(dto[key as keyof QueryUserDto]).toEqual(
            scenario.query[key as keyof typeof scenario.query]
          );
        });
      }
    });

    it('should validate empty query for full user listing', async () => {
      // Arrange: Empty query for full user listing (administrative use)
      const emptyQuery = {};

      // Act: Validate empty query
      const dto = plainToClass(QueryUserDto, emptyQuery);
      const errors = await validate(dto);

      // Assert: Empty queries supported for administrative full listings
      expect(errors).toHaveLength(0);
      expect(dto.recordId).toBeUndefined();
      expect(dto.name).toBeUndefined();
      expect(dto.userType).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
      expect(dto.includeInactives).toBeUndefined();
    });

    it('should validate single-criterion searches for focused queries', async () => {
      // Arrange: Single-criterion searches for various business needs
      const singleCriterionSearches = [
        { recordId: 'SINGLE_RECORD_LOOKUP' },
        { name: 'Single Name Search' },
        { userType: UserType.CONTACT },
        { isDeleted: false },
        { includeInactives: true },
      ];

      for (const search of singleCriterionSearches) {
        // Act: Validate single-criterion search
        const dto = plainToClass(QueryUserDto, search);
        const errors = await validate(dto);

        // Assert: Single-criterion searches supported for focused queries
        expect(errors).toHaveLength(0);
        Object.keys(search).forEach(key => {
          expect(dto[key as keyof QueryUserDto]).toEqual(search[key as keyof typeof search]);
        });
      }
    });
  });

  describe('Business Query Edge Cases', () => {
    it('should validate international user name queries', async () => {
      // Arrange: International agricultural professional names with special characters
      const internationalNames = [
        'François Dubois Agricultural Consultant',
        'María García-López Farm Management',
        'Müller Obstbau Agricultural Services',
        'João Silva Orchard Specialists',
        '田中太郎 Agricultural Solutions'
      ];

      for (const name of internationalNames) {
        // Act: Validate international name query
        const dto = plainToClass(QueryUserDto, { name });
        const errors = await validate(dto);

        // Assert: International names supported for global agricultural business queries
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(name);
      }
    });

    it('should validate business recordId pattern variations', async () => {
      // Arrange: Common agricultural business recordId patterns
      const businessRecordIds = [
        'USR0001', // Standard format
        'CONSULTANT_SENIOR_001', // Descriptive format
        'SEASONAL_WORKER_2024', // Seasonal identifier
        'FARM_OWNER_PREMIUM_042', // Business category format
      ];

      for (const recordId of businessRecordIds) {
        // Act: Validate business recordId pattern
        const dto = plainToClass(QueryUserDto, { recordId });
        const errors = await validate(dto);

        // Assert: Business recordId patterns supported for user identification
        expect(errors).toHaveLength(0);
        expect(dto.recordId).toBe(recordId);
      }
    });

    it('should validate comprehensive multi-field edge case queries', async () => {
      // Arrange: Edge case combinations for comprehensive user searches
      const edgeCaseQueries = [
        {
          description: 'International consultant with specific type',
          query: {
            name: 'François Agricultural Consultant',
            userType: UserType.EMPLOYEE,
            includeInactives: true
          }
        },
        {
          description: 'Seasonal worker comprehensive search',
          query: {
            name: 'Seasonal',
            userType: UserType.CONTACT,
            isDeleted: false,
            includeInactives: true
          }
        },
      ];

      for (const testCase of edgeCaseQueries) {
        // Act: Validate edge case multi-field query
        const dto = plainToClass(QueryUserDto, testCase.query);
        const errors = await validate(dto);

        // Assert: Edge case queries supported for comprehensive user management
        expect(errors).toHaveLength(0);
        Object.keys(testCase.query).forEach(key => {
          expect(dto[key as keyof QueryUserDto]).toEqual(
            testCase.query[key as keyof typeof testCase.query]
          );
        });
      }
    });
  });

  describe('Integration with RootStock User Query System', () => {
    it('should prepare data for UsersService.findAll() integration', async () => {
      // Arrange: Query DTO that mirrors UsersService query expectations
      const serviceIntegrationDto = {
        name: 'Agricultural Consultant',
        email: 'consultant@orchards.com',
        userType: UserType.EMPLOYEE,
        includeInactives: false,
        isDeleted: false,
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(QueryUserDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by UsersService query methods
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('email');
      expect(dto).toHaveProperty('userType');
      expect(dto).toHaveProperty('includeInactives');
      expect(dto).toHaveProperty('isDeleted');
      
      // Business context: Service will build MongoDB query from these parameters
      expect(dto.name).toBe('Agricultural Consultant');
      expect(dto.email).toBe('consultant@orchards.com');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.includeInactives).toBe(false);
      expect(dto.isDeleted).toBe(false);
    });

    it('should support agricultural user discovery workflows', async () => {
      // Arrange: Different user discovery scenarios for agricultural operations
      const discoveryWorkflows = [
        {
          description: 'Find consultants for client assignment',
          query: { userType: UserType.EMPLOYEE, includeInactives: false },
          purpose: 'Client assignment workflow'
        },
        {
          description: 'Find farm owners for relationship management',
          query: { userType: UserType.CONTACT, isDeleted: false },
          purpose: 'CRM workflow'
        },
        {
          description: 'Find seasonal workers for reactivation',
          query: { name: 'Seasonal', includeInactives: true },
          purpose: 'Seasonal workforce planning'
        },
        {
          description: 'Find archived users for data migration',
          query: { isDeleted: true, includeInactives: true },
          purpose: 'Data management workflow'
        },
      ];

      for (const workflow of discoveryWorkflows) {
        // Act: Validate user discovery workflow
        const dto = plainToClass(QueryUserDto, workflow.query);
        const errors = await validate(dto);

        // Assert: All discovery workflows are supported
        expect(errors).toHaveLength(0);
        Object.keys(workflow.query).forEach(key => {
          expect(dto[key as keyof QueryUserDto]).toEqual(
            workflow.query[key as keyof typeof workflow.query]
          );
        });
      }
    });

    it('should handle agricultural business reporting queries', async () => {
      // Arrange: Reporting-focused query scenarios
      const reportingQueries = [
        {
          description: 'Active workforce report',
          query: { includeInactives: false, isDeleted: false },
          report: 'Current workforce status'
        },
        {
          description: 'User type distribution report',
          query: { userType: UserType.EMPLOYEE },
          report: 'Employee consultant analysis'
        },
        {
          description: 'Historical user data report',
          query: { includeInactives: true, isDeleted: true },
          report: 'Complete historical user dataset'
        },
      ];

      for (const reportQuery of reportingQueries) {
        // Act: Validate reporting query
        const dto = plainToClass(QueryUserDto, reportQuery.query);
        const errors = await validate(dto);

        // Assert: Reporting queries supported for business intelligence
        expect(errors).toHaveLength(0);
        Object.keys(reportQuery.query).forEach(key => {
          expect(dto[key as keyof QueryUserDto]).toEqual(
            reportQuery.query[key as keyof typeof reportQuery.query]
          );
        });
      }
    });
  });
});
