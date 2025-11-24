import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryClientDto } from './query-client.dto';

describe('QueryClientDto - RootStock Client Query Validation', () => {

  describe('RootStock Business Client Filtering Scenarios', () => {
    it('should validate orchard client search by recordId', async () => {
      // Arrange: Search for specific client by business identifier
      const recordIdQueryDto = {
        recordId: 'CLI0001'
      };

      // Act: Transform and validate recordId query
      const dto = plainToClass(QueryClientDto, recordIdQueryDto);
      const errors = await validate(dto);

      // Assert: RecordId search supports efficient client lookup
      expect(errors).toHaveLength(0);
      expect(dto.recordId).toBe('CLI0001');
    });

    it('should validate premium client search by name', async () => {
      // Arrange: Search for clients by business name
      const nameQueryDto = {
        name: 'Premium Apple Orchards'
      };

      // Act: Validate name-based search
      const dto = plainToClass(QueryClientDto, nameQueryDto);
      const errors = await validate(dto);

      // Assert: Name search supports business client discovery
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium Apple Orchards');
    });

    it('should validate subsidiary-specific client search', async () => {
      // Arrange: Search for clients within subsidiary management
      const subsidiaryQueryDto = {
        subsidiaryId: '507f1f77bcf86cd799439011'
      };

      // Act: Validate subsidiary-scoped search
      const dto = plainToClass(QueryClientDto, subsidiaryQueryDto);
      const errors = await validate(dto);

      // Assert: Subsidiary filtering supports multi-tenant client management
      expect(errors).toHaveLength(0);
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
    });

    it('should validate family farm search by partial name', async () => {
      // Arrange: Partial name search for family operations
      const partialNameDto = {
        name: 'Family'
      };

      // Act: Validate partial name search
      const dto = plainToClass(QueryClientDto, partialNameDto);
      const errors = await validate(dto);

      // Assert: Partial name search supports flexible client discovery
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Family');
    });
  });

  describe('Client Status Filtering for Business Operations', () => {
    it('should validate active clients filter for normal operations', async () => {
      // Arrange: Filter for active clients only
      const activeClientsDto = {
        isDeleted: false,
        includeInactives: false
      };

      // Act: Validate active clients filter
      const dto = plainToClass(QueryClientDto, activeClientsDto);
      const errors = await validate(dto);

      // Assert: Active client filtering supports normal business operations
      expect(errors).toHaveLength(0);
      expect(dto.isDeleted).toBe(false);
      expect(dto.includeInactives).toBe(false);
    });

    it('should validate deleted clients filter for audit scenarios', async () => {
      // Arrange: Filter for deleted clients (audit/recovery scenario)
      const deletedClientsDto = {
        isDeleted: true
      };

      // Act: Validate deleted clients filter
      const dto = plainToClass(QueryClientDto, deletedClientsDto);
      const errors = await validate(dto);

      // Assert: Deleted client filtering supports audit and recovery workflows
      expect(errors).toHaveLength(0);
      expect(dto.isDeleted).toBe(true);
    });

    it('should validate administrative review with inactive inclusion', async () => {
      // Arrange: Administrative query including inactive clients
      const adminReviewDto = {
        includeInactives: true,
        isDeleted: false
      };

      // Act: Validate administrative review filter
      const dto = plainToClass(QueryClientDto, adminReviewDto);
      const errors = await validate(dto);

      // Assert: Administrative filtering supports comprehensive client review
      expect(errors).toHaveLength(0);
      expect(dto.includeInactives).toBe(true);
      expect(dto.isDeleted).toBe(false);
    });
  });

  describe('Multi-field Business Query Scenarios', () => {
    it('should validate comprehensive client audit query', async () => {
      // Arrange: Complete audit query with multiple filters
      const auditQueryDto = {
        name: 'Valley Vista',
        isDeleted: false,
        includeInactives: true,
        subsidiaryId: '507f1f77bcf86cd799439011'
      };

      // Act: Validate comprehensive audit query
      const dto = plainToClass(QueryClientDto, auditQueryDto);
      const errors = await validate(dto);

      // Assert: Multi-field queries support complex business analysis
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Valley Vista');
      expect(dto.isDeleted).toBe(false);
      expect(dto.includeInactives).toBe(true);
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
    });

    it('should validate subsidiary client management query', async () => {
      // Arrange: Query for managing clients within specific subsidiary
      const managementQueryDto = {
        subsidiaryId: '507f1f77bcf86cd799439012',
        isDeleted: false,
        includeInactives: false
      };

      // Act: Validate subsidiary management query
      const dto = plainToClass(QueryClientDto, managementQueryDto);
      const errors = await validate(dto);

      // Assert: Subsidiary-scoped queries support multi-tenant management
      expect(errors).toHaveLength(0);
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439012');
      expect(dto.isDeleted).toBe(false);
      expect(dto.includeInactives).toBe(false);
    });

    it('should validate client migration discovery query', async () => {
      // Arrange: Query for finding specific clients during migration
      const migrationQueryDto = {
        recordId: 'CLI0042',
        name: 'Legacy Orchard',
        isDeleted: false
      };

      // Act: Validate migration discovery query
      const dto = plainToClass(QueryClientDto, migrationQueryDto);
      const errors = await validate(dto);

      // Assert: Migration queries support system upgrade workflows
      expect(errors).toHaveLength(0);
      expect(dto.recordId).toBe('CLI0042');
      expect(dto.name).toBe('Legacy Orchard');
      expect(dto.isDeleted).toBe(false);
    });
  });

  describe('Query Data Quality Validation', () => {
    it('should reject non-string recordId values', async () => {
      // Arrange: Query with invalid recordId type
      const invalidRecordIdDto = {
        recordId: 123 // Should be string
      };

      // Act: Validate query with invalid recordId type
      const dto = plainToClass(QueryClientDto, invalidRecordIdDto);
      const errors = await validate(dto);

      // Assert: Non-string recordId values rejected for data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('recordId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject non-string name values', async () => {
      // Arrange: Query with invalid name type
      const invalidNameDto = {
        name: 456 // Should be string
      };

      // Act: Validate query with invalid name type
      const dto = plainToClass(QueryClientDto, invalidNameDto);
      const errors = await validate(dto);

      // Assert: Non-string name values rejected for data integrity
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject invalid subsidiaryId ObjectId formats', async () => {
      // Arrange: Query with invalid ObjectId format
      const invalidObjectIdDto = {
        subsidiaryId: 'invalid-objectid-format'
      };

      // Act: Validate query with invalid ObjectId
      const dto = plainToClass(QueryClientDto, invalidObjectIdDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectId formats rejected for data security
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('subsidiaryId');
      expect(errors[0].constraints).toHaveProperty('isMongoId');
    });
  });

  describe('Empty and Optional Query Handling', () => {
    it('should validate empty query for all clients discovery', async () => {
      // Arrange: Empty query object (no filters applied)
      const emptyQueryDto = {};

      // Act: Validate empty query
      const dto = plainToClass(QueryClientDto, emptyQueryDto);
      const errors = await validate(dto);

      // Assert: Empty queries supported for discovery workflows
      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.recordId).toBeUndefined();
      expect(dto.subsidiaryId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
      expect(dto.includeInactives).toBeUndefined();
    });

    it('should handle undefined optional fields properly', async () => {
      // Arrange: Query with explicit undefined values
      const undefinedFieldsDto = {
        recordId: undefined,
        name: undefined,
        subsidiaryId: undefined,
        isDeleted: undefined,
        includeInactives: undefined
      };

      // Act: Validate query with undefined fields
      const dto = plainToClass(QueryClientDto, undefinedFieldsDto);
      const errors = await validate(dto);

      // Assert: Undefined optional fields handled correctly
      expect(errors).toHaveLength(0);
    });

    it('should validate single-field query scenarios', async () => {
      // Arrange: Test individual field queries for targeted searches
      const singleFieldQueries = [
        { recordId: 'CLI0001' },
        { name: 'Premium' },
        { subsidiaryId: '507f1f77bcf86cd799439011' },
        { isDeleted: false },
        { includeInactives: true }
      ];

      for (const queryDto of singleFieldQueries) {
        // Act: Validate single-field query
        const dto = plainToClass(QueryClientDto, queryDto);
        const errors = await validate(dto);

        // Assert: Single-field queries supported for efficient filtering
        expect(errors).toHaveLength(0);
        Object.keys(queryDto).forEach(key => {
          expect(dto[key as keyof QueryClientDto]).toEqual(queryDto[key as keyof typeof queryDto]);
        });
      }
    });
  });

  describe('Business Query Edge Cases', () => {
    it('should validate international client name queries', async () => {
      // Arrange: International business names with special characters
      const internationalNames = [
        'Café des Pommes',
        'Müller Obstbau GmbH',
        'Naranjas López S.A.',
        'São Paulo Frutas Ltda'
      ];

      for (const name of internationalNames) {
        // Act: Validate international name query
        const dto = plainToClass(QueryClientDto, { name });
        const errors = await validate(dto);

        // Assert: International names supported for global business queries
        expect(errors).toHaveLength(0);
        expect(dto.name).toBe(name);
      }
    });

    it('should validate subsidiary ObjectId boundary values', async () => {
      // Arrange: Test ObjectId edge cases for subsidiary queries
      const edgeCaseIds = [
        '000000000000000000000000', // Minimum ObjectId
        'ffffffffffffffffffffffff'  // Maximum ObjectId
      ];

      for (const objectId of edgeCaseIds) {
        // Act: Validate ObjectId edge case
        const dto = plainToClass(QueryClientDto, { subsidiaryId: objectId });
        const errors = await validate(dto);

        // Assert: ObjectId boundary values supported for comprehensive queries
        expect(errors).toHaveLength(0);
        expect(dto.subsidiaryId).toBe(objectId);
      }
    });

    it('should validate business recordId format patterns', async () => {
      // Arrange: Common business recordId patterns
      const businessRecordIds = [
        'CLI0001', // Standard format
        'CLI0999', // High sequence number
        'CLI1234', // Mid-range number
        'CLI9999'  // Maximum expected range
      ];

      for (const recordId of businessRecordIds) {
        // Act: Validate business recordId pattern
        const dto = plainToClass(QueryClientDto, { recordId });
        const errors = await validate(dto);

        // Assert: Business recordId patterns supported for client identification
        expect(errors).toHaveLength(0);
        expect(dto.recordId).toBe(recordId);
      }
    });
  });

  describe('Optional Field Query Handling', () => {
    it('should validate empty query for all clients discovery', async () => {
      // Arrange: Empty query object (no filters applied)
      const emptyQueryDto = {};

      // Act: Validate empty query
      const dto = plainToClass(QueryClientDto, emptyQueryDto);
      const errors = await validate(dto);

      // Assert: Empty queries supported for discovery workflows
      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.recordId).toBeUndefined();
      expect(dto.subsidiaryId).toBeUndefined();
      expect(dto.isDeleted).toBeUndefined();
      expect(dto.includeInactives).toBeUndefined();
    });

    it('should handle all optional fields as undefined', async () => {
      // Arrange: Query with explicit undefined values
      const undefinedFieldsDto = {
        recordId: undefined,
        name: undefined,
        subsidiaryId: undefined,
        isDeleted: undefined,
        includeInactives: undefined
      };

      // Act: Validate query with undefined fields
      const dto = plainToClass(QueryClientDto, undefinedFieldsDto);
      const errors = await validate(dto);

      // Assert: All optional fields handle undefined correctly
      expect(errors).toHaveLength(0);
    });

    it('should validate single-field query scenarios', async () => {
      // Arrange: Test individual field queries for targeted searches
      const singleFieldQueries = [
        { recordId: 'CLI0001' },
        { name: 'Premium' },
        { subsidiaryId: '507f1f77bcf86cd799439011' },
        { isDeleted: false },
        { includeInactives: true }
      ];

      for (const queryDto of singleFieldQueries) {
        // Act: Validate single-field query
        const dto = plainToClass(QueryClientDto, queryDto);
        const errors = await validate(dto);

        // Assert: Single-field queries supported for efficient filtering
        expect(errors).toHaveLength(0);
        Object.keys(queryDto).forEach(key => {
          expect(dto[key as keyof QueryClientDto]).toEqual(queryDto[key as keyof typeof queryDto]);
        });
      }
    });
  });

  describe('Business Query Performance Considerations', () => {
    it('should validate efficient indexed field queries', async () => {
      // Arrange: Queries using indexed fields for performance
      const indexedQueries = [
        { recordId: 'CLI0001' }, // Indexed business key
        { subsidiaryId: '507f1f77bcf86cd799439011' }, // Indexed relationship
      ];

      for (const queryDto of indexedQueries) {
        // Act: Validate indexed field query
        const dto = plainToClass(QueryClientDto, queryDto);
        const errors = await validate(dto);

        // Assert: Indexed queries validated for efficient database operations
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate complex business query combinations', async () => {
      // Arrange: Complex query with multiple business criteria
      const complexQueryDto = {
        name: 'Premium',
        subsidiaryId: '507f1f77bcf86cd799439011',
        isDeleted: false,
        includeInactives: false
      };

      // Act: Validate complex business query
      const dto = plainToClass(QueryClientDto, complexQueryDto);
      const errors = await validate(dto);

      // Assert: Complex queries support advanced business filtering
      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Premium');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
      expect(dto.isDeleted).toBe(false);
      expect(dto.includeInactives).toBe(false);
    });
  });

  describe('Integration with RootStock Client Query System', () => {
    it('should prepare data for ClientsService.findAll() integration', async () => {
      // Arrange: Query DTO that mirrors ClientsService query expectations
      const serviceIntegrationDto = {
        name: 'Premium Orchards',
        subsidiaryId: '507f1f77bcf86cd799439011',
        includeInactives: false,
        isDeleted: false,
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(QueryClientDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by ClientsService query methods
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('subsidiaryId');
      expect(dto).toHaveProperty('includeInactives');
      expect(dto).toHaveProperty('isDeleted');
      
      // Business context: Service will build MongoDB query from these parameters
      expect(dto.name).toBe('Premium Orchards');
      expect(dto.subsidiaryId).toBe('507f1f77bcf86cd799439011');
      expect(dto.includeInactives).toBe(false);
      expect(dto.isDeleted).toBe(false);
    });

    it('should support agricultural client discovery workflows', async () => {
      // Arrange: Different client discovery scenarios for agricultural operations
      const discoveryWorkflows = [
        {
          description: 'Find clients for subsidiary management',
          query: { subsidiaryId: '507f1f77bcf86cd799439012', includeInactives: false },
          purpose: 'Subsidiary management workflow'
        },
        {
          description: 'Find premium clients for account management',
          query: { name: 'Premium', isDeleted: false },
          purpose: 'Account management workflow'
        },
        {
          description: 'Find archived clients for data migration',
          query: { isDeleted: true, includeInactives: true },
          purpose: 'Data management workflow'
        },
      ];

      for (const workflow of discoveryWorkflows) {
        // Act: Validate client discovery workflow
        const dto = plainToClass(QueryClientDto, workflow.query);
        const errors = await validate(dto);

        // Assert: All discovery workflows are supported
        expect(errors).toHaveLength(0);
        Object.keys(workflow.query).forEach(key => {
          expect(dto[key as keyof QueryClientDto]).toEqual(
            workflow.query[key as keyof typeof workflow.query]
          );
        });
      }
    });

    it('should handle agricultural business reporting queries', async () => {
      // Arrange: Reporting-focused query scenarios
      const reportingQueries = [
        {
          description: 'Active client portfolio report',
          query: { includeInactives: false, isDeleted: false },
          report: 'Current active client status'
        },
        {
          description: 'Subsidiary client distribution report',
          query: { subsidiaryId: '507f1f77bcf86cd799439013' },
          report: 'Subsidiary-specific client analysis'
        },
        {
          description: 'Historical client data report',
          query: { includeInactives: true, isDeleted: true },
          report: 'Complete historical client dataset'
        },
      ];

      for (const reportQuery of reportingQueries) {
        // Act: Validate reporting query
        const dto = plainToClass(QueryClientDto, reportQuery.query);
        const errors = await validate(dto);

        // Assert: Reporting queries supported for business intelligence
        expect(errors).toHaveLength(0);
        Object.keys(reportQuery.query).forEach(key => {
          expect(dto[key as keyof QueryClientDto]).toEqual(
            reportQuery.query[key as keyof typeof reportQuery.query]
          );
        });
      }
    });
  });
});
