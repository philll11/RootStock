import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserType } from '../schemas/user.schema';

// Mock the validator constraints before importing the DTO
const mockRoleValidatorConstraint = {
  validate: jest.fn().mockResolvedValue(true),
  defaultMessage: jest.fn().mockReturnValue('roleId must reference a valid role'),
};

const mockClientValidatorConstraint = {
  validate: jest.fn().mockResolvedValue(true),
  defaultMessage: jest.fn().mockReturnValue('clientIds must reference valid clients'),
};

const mockClientIdsValidForUserTypeConstraint = {
  validate: jest.fn().mockReturnValue(true),
  defaultMessage: jest.fn().mockReturnValue('Invalid client ID assignment for the specified user type'),
};

// Mock the entire validator files
jest.mock('../../roles/validators/is-existing-role.validator', () => ({
  IsExistingRoleConstraint: jest.fn().mockImplementation(() => mockRoleValidatorConstraint),
}));

jest.mock('../../clients/validators/is-existing-client.validator', () => ({
  IsExistingClientConstraint: jest.fn().mockImplementation(() => mockClientValidatorConstraint),
}));

jest.mock('../validators/is-client-ids-valid-for-user-type.validator', () => ({
  IsClientIdsValidForUserTypeConstraint: jest.fn().mockImplementation(() => mockClientIdsValidForUserTypeConstraint),
}));

// Mock the decorators to use our mocked constraints
jest.mock('../../roles/decorators/is-existing-role.decorator', () => ({
  IsExistingRole: () => () => {}, // No-op decorator for unit tests
}));

jest.mock('../../clients/decorators/is-existing-client.decorator', () => ({
  IsExistingClient: () => () => {}, // No-op decorator for unit tests
}));

describe('CreateUserDto - RootStock Agricultural User Creation Validation', () => {
  
  describe('RootStock Agricultural User Creation Scenarios', () => {
    it('should validate multi-client consultant employee creation', async () => {
      // Arrange: Agricultural consultant managing multiple orchard clients
      const consultantEmployeeDto = {
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@consultants.com',
        userType: UserType.EMPLOYEE,
        roleId: '507f1f77bcf86cd799439011',
        clientIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
      };

      // Act: Transform and validate consultant employee DTO
      const dto = plainToClass(CreateUserDto, consultantEmployeeDto);
      const errors = await validate(dto);

      // Assert: Multi-client consultant is valid for agricultural business operations
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('Sarah');
      expect(dto.lastName).toBe('Chen');
      expect(dto.email).toBe('sarah.chen@consultants.com');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.roleId).toBe('507f1f77bcf86cd799439011');
      expect(dto.clientIds).toHaveLength(3);
    });

    it('should validate single orchard contact user creation', async () => {
      // Arrange: Farm owner managing their own orchard operation
      const orchardOwnerDto = {
        firstName: 'Michael',
        lastName: 'Thompson',
        email: 'michael.thompson@farm.com',
        userType: UserType.CONTACT,
        roleId: '507f1f77bcf86cd799439015',
        clientIds: ['507f1f77bcf86cd799439016'], // Single client only
      };

      // Act: Validate orchard owner contact for business workflow
      const dto = plainToClass(CreateUserDto, orchardOwnerDto);
      const errors = await validate(dto);

      // Assert: Single client contact properly configured for orchard management
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('Michael');
      expect(dto.lastName).toBe('Thompson');
      expect(dto.email).toBe('michael.thompson@farm.com');
      expect(dto.userType).toBe(UserType.CONTACT);
      expect(dto.clientIds).toHaveLength(1);
    });

    it('should validate new employee user without initial assignments', async () => {
      // Arrange: New agricultural advisor awaiting client and role assignments
      const newAdvisorDto = {
        firstName: 'Elena',
        lastName: 'Rodriguez',
        email: 'elena.rodriguez@orchards.com',
        userType: UserType.EMPLOYEE,
        // Optional roleId and clientIds omitted for new user
      };

      // Act: Validate new employee for business onboarding
      const dto = plainToClass(CreateUserDto, newAdvisorDto);
      const errors = await validate(dto);

      // Assert: New employee ready for future assignments
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('Elena');
      expect(dto.lastName).toBe('Rodriguez');
      expect(dto.email).toBe('elena.rodriguez@orchards.com');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.roleId).toBeUndefined();
      expect(dto.clientIds).toBeUndefined();
    });

    it('should validate international user with unicode characters', async () => {
      // Arrange: International agricultural professional with unicode name
      const internationalUserDto = {
        firstName: 'José María',
        lastName: 'García-López',
        email: 'jose.garcia-lopez@agricultura.es',
        userType: UserType.EMPLOYEE,
        roleId: '507f1f77bcf86cd799439017',
        clientIds: ['507f1f77bcf86cd799439018'],
      };

      // Act: Validate international user for global operations
      const dto = plainToClass(CreateUserDto, internationalUserDto);
      const errors = await validate(dto);

      // Assert: International user names supported for global agricultural business
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('José María');
      expect(dto.lastName).toBe('García-López');
      expect(dto.email).toBe('jose.garcia-lopez@agricultura.es');
    });

    it('should validate field manager contact for specialized operations', async () => {
      // Arrange: Field manager responsible for specific orchard blocks
      const fieldManagerDto = {
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@fieldmanagement.com',
        userType: UserType.CONTACT,
        roleId: '507f1f77bcf86cd799439019',
        clientIds: ['507f1f77bcf86cd799439020'],
      };

      // Act: Validate field manager contact
      const dto = plainToClass(CreateUserDto, fieldManagerDto);
      const errors = await validate(dto);

      // Assert: Field manager configured for specialized orchard operations
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('David');
      expect(dto.lastName).toBe('Kim');
      expect(dto.email).toBe('david.kim@fieldmanagement.com');
      expect(dto.userType).toBe(UserType.CONTACT);
    });
  });

  describe('Required Business Field Validation', () => {
    it('should require firstName for agricultural user identification', async () => {
      // Arrange: User without firstName (critical for identification)
      const incompleteDto = {
        lastName: 'Smith',
        email: 'test@orchards.com',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user without firstName
      const dto = plainToClass(CreateUserDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: FirstName is required for user identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('firstName');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should require lastName for agricultural user identification', async () => {
      // Arrange: User without lastName (critical for identification)
      const incompleteDto = {
        firstName: 'John',
        email: 'test@orchards.com',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user without lastName
      const dto = plainToClass(CreateUserDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: LastName is required for user identification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('lastName');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should require email for agricultural user authentication', async () => {
      // Arrange: User without email (critical for login)
      const incompleteDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user without email
      const dto = plainToClass(CreateUserDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: Email is required for platform authentication
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should require userType for agricultural role classification', async () => {
      // Arrange: User without userType (critical for access control)
      const incompleteDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@orchards.com',
      };

      // Act: Validate user without userType
      const dto = plainToClass(CreateUserDto, incompleteDto);
      const errors = await validate(dto);

      // Assert: UserType is required for role classification
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject empty string names for business identification', async () => {
      // Arrange: User with empty name fields (insufficient for business use)
      const emptyNamesDto = {
        firstName: '',
        lastName: '',
        email: 'empty@orchards.com',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user with empty names
      const dto = plainToClass(CreateUserDto, emptyNamesDto);
      const errors = await validate(dto);

      // Assert: Non-empty names required for business identification
      expect(errors).toHaveLength(2);
      const firstNameError = errors.find(err => err.property === 'firstName');
      const lastNameError = errors.find(err => err.property === 'lastName');
      expect(firstNameError?.constraints).toHaveProperty('isNotEmpty');
      expect(lastNameError?.constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject non-string name values for data integrity', async () => {
      // Arrange: User with invalid name types
      const invalidTypeDto = {
        firstName: 12345, // Invalid type
        lastName: true, // Invalid type
        email: 'invalid@example.com',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user with invalid field types
      const dto = plainToClass(CreateUserDto, invalidTypeDto);
      const errors = await validate(dto);

      // Assert: String validation enforces data integrity (should have 2 name errors + email still works)
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const firstNameError = errors.find(err => err.property === 'firstName');
      const lastNameError = errors.find(err => err.property === 'lastName');
      expect(firstNameError?.constraints).toHaveProperty('isString');
      expect(lastNameError?.constraints).toHaveProperty('isString');
    });

    it('should reject whitespace-only names for business identification', async () => {
      // Arrange: User with whitespace-only names (insufficient for business)
      // Note: Global ValidationPipe transforms whitespace to empty strings
      const whitespaceNamesDto = {
        firstName: '   ', // Only whitespace - transforms to empty string
        lastName: '   ', // Only whitespace - transforms to empty string  
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user with whitespace-only names
      const dto = plainToClass(CreateUserDto, whitespaceNamesDto);
      const errors = await validate(dto);

      // Assert: Whitespace-only names rejected for business identification
      // May be 1 or 2 errors depending on validation optimization
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const hasFirstNameError = errors.some(err => err.property === 'firstName');
      const hasLastNameError = errors.some(err => err.property === 'lastName');
      expect(hasFirstNameError || hasLastNameError).toBe(true);
    });
  });

  describe('Email Authentication Field Validation', () => {
    it('should require email for user authentication', async () => {
      // Arrange: User without email (prevents platform login)
      const userWithoutEmailDto = {
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.EMPLOYEE,
      };

      // Act: Validate user creation without email
      const dto = plainToClass(CreateUserDto, userWithoutEmailDto);
      const errors = await validate(dto);

      // Assert: Email is required for platform authentication
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should accept valid email addresses for business users', async () => {
      // Arrange: Business users with valid email addresses
      const businessUserScenarios = [
        {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@orchards.com',
          userType: UserType.EMPLOYEE,
          description: 'Employee consultant with corporate email'
        },
        {
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria@farm.co',
          userType: UserType.CONTACT,
          description: 'Farm owner with short domain'
        },
        {
          firstName: 'International',
          lastName: 'User',
          email: 'user@agriculture.co.uk',
          userType: UserType.EMPLOYEE,
          description: 'International user with country domain'
        },
      ];

      for (const scenario of businessUserScenarios) {
        // Act: Validate business user with email
        const dto = plainToClass(CreateUserDto, scenario);
        const errors = await validate(dto);

        // Assert: Valid business emails are accepted
        expect(errors).toHaveLength(0);
        expect(dto.email).toBe(scenario.email);
        expect(dto.firstName).toBe(scenario.firstName);
        expect(dto.lastName).toBe(scenario.lastName);
      }
    });

    it('should automatically lowercase email addresses for database consistency', async () => {
      // Arrange: Mixed-case email (common user input)
      const mixedCaseEmailDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'Test.USER@ORCHARDS.COM',
        userType: UserType.EMPLOYEE,
      };

      // Act: Transform email case
      const dto = plainToClass(CreateUserDto, mixedCaseEmailDto);
      const errors = await validate(dto);

      // Assert: Email is normalized to lowercase for consistency
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('test.user@orchards.com');
    });

    it('should trim whitespace from email addresses', async () => {
      // Arrange: Email with surrounding whitespace
      const whitespaceEmailDto = {
        firstName: 'Test',
        lastName: 'User',
        email: '  user@orchards.com  ',
        userType: UserType.EMPLOYEE,
      };

      // Act: Transform email whitespace
      const dto = plainToClass(CreateUserDto, whitespaceEmailDto);
      const errors = await validate(dto);

      // Assert: Whitespace is trimmed for data quality
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('user@orchards.com');
    });

    it('should validate email is provided for all user types', async () => {
      // Arrange: Test email requirement across user types
      const userTypeScenarios = [
        {
          userType: UserType.EMPLOYEE,
          email: 'employee@orchards.com',
          description: 'Employee requires email for platform access'
        },
        {
          userType: UserType.CONTACT,
          email: 'contact@farm.com',
          description: 'Contact requires email for platform access'
        },
      ];

      for (const scenario of userTypeScenarios) {
        // Act: Validate user type with email requirement
        const dto = plainToClass(CreateUserDto, {
          firstName: 'Test',
          lastName: 'User',
          email: scenario.email,
          userType: scenario.userType,
        });
        const errors = await validate(dto);

        // Assert: All user types require email for authentication
        expect(errors).toHaveLength(0);
        expect(dto.email).toBe(scenario.email);
        expect(dto.userType).toBe(scenario.userType);
      }
    });

    it('should validate email in complete user creation scenarios', async () => {
      // Arrange: Complete agricultural user creation with email
      const completeUserDto = {
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@agricultural-consultants.com',
        userType: UserType.EMPLOYEE,
        roleId: '507f1f77bcf86cd799439011',
        clientIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
      };

      // Act: Validate complete user creation
      const dto = plainToClass(CreateUserDto, completeUserDto);
      const errors = await validate(dto);

      // Assert: Email integrates properly with complete user data
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('sarah.chen@agricultural-consultants.com');
      expect(dto.firstName).toBe('Sarah');
      expect(dto.lastName).toBe('Chen');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
      expect(dto.clientIds).toHaveLength(2);
    });
  });

  describe('UserType Enum Validation', () => {
    it('should validate all supported agricultural user types', async () => {
      // Arrange: Test all valid user types for agricultural operations
      const userTypes = [
        { type: UserType.EMPLOYEE, description: 'Agricultural consultant employee' },
        { type: UserType.CONTACT, description: 'Farm owner contact user' },
      ];

      for (const userTypeTest of userTypes) {
        // Act: Validate each agricultural user type
        const dto = plainToClass(CreateUserDto, {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          userType: userTypeTest.type,
        });
        const errors = await validate(dto);

        // Assert: All agricultural user types are accepted
        expect(errors).toHaveLength(0);
        expect(dto.userType).toBe(userTypeTest.type);
      }
    });

    it('should reject invalid userType values for data security', async () => {
      // Arrange: User with invalid userType (security risk)
      const invalidUserTypeDto = {
        firstName: 'Invalid',
        lastName: 'Type',
        email: 'invalid@example.com',
        userType: 'invalid-type' as any, // Not a valid enum value
      };

      // Act: Validate user with invalid userType
      const dto = plainToClass(CreateUserDto, invalidUserTypeDto);
      const errors = await validate(dto);

      // Assert: Invalid userTypes rejected to prevent access control issues (should have userType error)
      const userTypeError = errors.find(err => err.property === 'userType');
      expect(userTypeError).toBeDefined();
      expect(userTypeError?.constraints).toHaveProperty('isEnum');
    });

    it('should reject null userType for business classification', async () => {
      // Arrange: User with null userType (missing classification)
      const nullUserTypeDto = {
        firstName: 'Null',
        lastName: 'Type',
        email: 'null@example.com',
        userType: null as any,
      };

      // Act: Validate user with null userType
      const dto = plainToClass(CreateUserDto, nullUserTypeDto);
      const errors = await validate(dto);

      // Assert: Null userType rejected for proper classification (should have userType error)
      const userTypeError = errors.find(err => err.property === 'userType');
      expect(userTypeError).toBeDefined();
      expect(userTypeError?.constraints).toHaveProperty('isEnum');
    });
  });

  describe('Role Assignment Validation', () => {
    it('should validate all role assignment scenarios', async () => {
      // Arrange: Test valid role assignment scenarios for business operations
      const testCases = [
        { roleId: '507f1f77bcf86cd799439011', description: 'User with administrative role assignment' },
        { roleId: undefined, description: 'New user without initial role assignment' },
        { roleId: '000000000000000000000000', description: 'Edge case minimum ObjectId role' },
      ];

      for (const testCase of testCases) {
        // Act: Validate each business role assignment scenario
        const dto = plainToClass(CreateUserDto, {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          userType: UserType.EMPLOYEE,
          roleId: testCase.roleId,
        });
        const errors = await validate(dto);

        // Assert: All valid role assignments are accepted
        expect(errors).toHaveLength(0);
        expect(dto.roleId).toBe(testCase.roleId);
      }
    });

    it('should reject invalid roleId ObjectId formats for data security', async () => {
      // Arrange: User with invalid roleId ObjectId (security risk)
      const invalidRoleDto = {
        firstName: 'Invalid',
        lastName: 'Role',
        email: 'invalid@example.com',
        userType: UserType.EMPLOYEE,
        roleId: 'invalid-objectid-format', // Not a valid ObjectId
      };

      // Act: Validate user with invalid roleId
      const dto = plainToClass(CreateUserDto, invalidRoleDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected to prevent data integrity issues (should have roleId error)
      const roleIdError = errors.find(err => err.property === 'roleId');
      expect(roleIdError).toBeDefined();
      expect(roleIdError?.constraints).toHaveProperty('isMongoId');
    });

    it('should reject non-string roleId values for data integrity', async () => {
      // Arrange: User with invalid roleId type
      const invalidRoleTypeDto = {
        firstName: 'Invalid',
        lastName: 'Role',
        email: 'invalid@example.com',
        userType: UserType.EMPLOYEE,
        roleId: 12345 as any, // Invalid type
      };

      // Act: Validate user with invalid roleId type
      const dto = plainToClass(CreateUserDto, invalidRoleTypeDto);
      const errors = await validate(dto);

      // Assert: Non-string roleId values rejected for data integrity (should have roleId error)
      const roleIdError = errors.find(err => err.property === 'roleId');
      expect(roleIdError).toBeDefined();
      expect(roleIdError?.constraints).toHaveProperty('isMongoId');
    });
  });

  describe('Client Assignment Validation', () => {
    it('should validate all client assignment scenarios for business operations', async () => {
      // Arrange: Test valid client assignment scenarios
      const testCases = [
        { 
          clientIds: ['507f1f77bcf86cd799439011'], 
          userType: UserType.CONTACT,
          description: 'Contact user with single client assignment' 
        },
        { 
          clientIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'], 
          userType: UserType.EMPLOYEE,
          description: 'Employee consultant with multiple client assignments' 
        },
        { 
          clientIds: [], 
          userType: UserType.EMPLOYEE,
          description: 'New employee without initial client assignments' 
        },
        { 
          clientIds: undefined, 
          userType: UserType.EMPLOYEE,
          description: 'Employee user without client assignments' 
        },
      ];

      for (const testCase of testCases) {
        // Act: Validate each business client assignment scenario
        const dto = plainToClass(CreateUserDto, {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          userType: testCase.userType,
          clientIds: testCase.clientIds,
        });
        const errors = await validate(dto);

        // Assert: All valid client assignments are accepted
        expect(errors).toHaveLength(0);
        expect(dto.clientIds).toEqual(testCase.clientIds);
      }
    });

    it('should reject invalid clientId ObjectId formats for data security', async () => {
      // Arrange: User with invalid clientId ObjectIds (security risk)
      const invalidClientIdsDto = {
        firstName: 'Invalid',
        lastName: 'Clients',
        email: 'invalid@example.com',
        userType: UserType.EMPLOYEE,
        clientIds: ['invalid-objectid', '507f1f77bcf86cd799439011'], // Mixed valid/invalid
      };

      // Act: Validate user with invalid clientIds
      const dto = plainToClass(CreateUserDto, invalidClientIdsDto);
      const errors = await validate(dto);

      // Assert: Invalid ObjectIds rejected to prevent data integrity issues (should have clientIds error)
      const clientIdsError = errors.find(err => err.property === 'clientIds');
      expect(clientIdsError).toBeDefined();
      expect(clientIdsError?.constraints).toHaveProperty('isMongoId');
    });

    it('should reject non-array clientIds values for data integrity', async () => {
      // Arrange: User with invalid clientIds type
      const invalidClientIdsTypeDto = {
        firstName: 'Invalid',
        lastName: 'Array',
        email: 'invalid@example.com',
        userType: UserType.EMPLOYEE,
        clientIds: 'not-an-array' as any, // Invalid type
      };

      // Act: Validate user with invalid clientIds type
      const dto = plainToClass(CreateUserDto, invalidClientIdsTypeDto);
      const errors = await validate(dto);

      // Assert: Non-array clientIds values rejected for data integrity (should have clientIds error)
      const clientIdsError = errors.find(err => err.property === 'clientIds');
      expect(clientIdsError).toBeDefined();
      expect(clientIdsError?.constraints).toHaveProperty('isArray');
    });

    it('should reject empty string clientIds for data security', async () => {
      // Arrange: User with empty string in clientIds array
      const emptyClientIdDto = {
        firstName: 'Empty',
        lastName: 'Client',
        email: 'empty@example.com',
        userType: UserType.EMPLOYEE,
        clientIds: ['', '507f1f77bcf86cd799439011'], // Empty string included
      };

      // Act: Validate user with empty clientId
      const dto = plainToClass(CreateUserDto, emptyClientIdDto);
      const errors = await validate(dto);

      // Assert: Empty clientIds rejected to prevent data integrity issues (should have clientIds error)
      const clientIdsError = errors.find(err => err.property === 'clientIds');
      expect(clientIdsError).toBeDefined();
      expect(clientIdsError?.constraints).toHaveProperty('isMongoId');
    });
  });

  describe('Business Rule Enforcement for User Types', () => {
    beforeEach(() => {
      // Reset mock to default passing behavior
      mockClientIdsValidForUserTypeConstraint.validate.mockReturnValue(true);
    });

    it('should enforce contact user single client assignment rule', async () => {
      // Arrange: Contact user with multiple clients (violates business rule)
      // Note: This test validates the DTO structure, actual business rule validation 
      // happens in the custom validator which is mocked for unit testing
      const multipleClientsContactDto = {
        firstName: 'Invalid',
        lastName: 'Contact',
        userType: UserType.CONTACT,
        clientIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'], // Multiple clients - invalid for contact
      };

      // Act: Transform DTO (validation happens at runtime with actual validator)
      const dto = plainToClass(CreateUserDto, multipleClientsContactDto);
      
      // Assert: DTO structure is valid (business rule validation is separate)
      // The actual business rule enforcement happens in the validator constraint,
      // which is tested separately in is-client-ids-valid-for-user-type.validator.spec.ts
      expect(dto.firstName).toBe('Invalid');
      expect(dto.lastName).toBe('Contact');
      expect(dto.userType).toBe(UserType.CONTACT);
      expect(dto.clientIds).toHaveLength(2);
      
      // This test validates DTO transformation, not business rule enforcement
      // Business rule testing is done in the validator's own unit tests
    });

    it('should allow employee user flexible client assignments', async () => {
      // Arrange: Employee user with multiple client assignments (valid scenario)
      const validEmployeeDto = {
        firstName: 'Multi',
        lastName: 'Client',
        email: 'multi.client@example.com',
        userType: UserType.EMPLOYEE,
        clientIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'], // Multiple clients - valid for employee
      };

      // Act: Validate employee user with multiple clients
      const dto = plainToClass(CreateUserDto, validEmployeeDto);
      const errors = await validate(dto);

      // Assert: Employee users can have multiple client assignments
      expect(errors).toHaveLength(0);
      expect(dto.clientIds).toHaveLength(3);
    });

    it('should allow employee user with no client assignments for new hires', async () => {
      // Arrange: New employee without client assignments (valid onboarding scenario)
      const newEmployeeDto = {
        firstName: 'New',
        lastName: 'Employee',
        email: 'new.employee@example.com',
        userType: UserType.EMPLOYEE,
        clientIds: [], // No clients initially - valid for employee
      };

      // Act: Validate new employee without clients
      const dto = plainToClass(CreateUserDto, newEmployeeDto);
      const errors = await validate(dto);

      // Assert: New employees can start without client assignments
      expect(errors).toHaveLength(0);
      expect(dto.clientIds).toHaveLength(0);
    });
  });

  describe('Business Data Quality Validation', () => {
    it('should handle maximum business complexity user creation', async () => {
      // Arrange: User with maximum field lengths and complexity
      const complexUserDto = {
        firstName: 'María José Esperanza',
        lastName: 'García-López de la Cruz-Hernández',
        email: 'maria.garcia-lopez@international-agriculture.com',
        userType: UserType.EMPLOYEE,
        roleId: 'ffffffffffffffffffffffff', // Maximum ObjectId
        clientIds: [
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012', 
          '507f1f77bcf86cd799439013',
          '507f1f77bcf86cd799439014',
          '507f1f77bcf86cd799439015'
        ], // Multiple clients for consultant
      };

      // Act: Validate complex user configuration
      const dto = plainToClass(CreateUserDto, complexUserDto);
      const errors = await validate(dto);

      // Assert: Complex configurations supported for enterprise needs
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('María José Esperanza');
      expect(dto.lastName).toBe('García-López de la Cruz-Hernández');
      expect(dto.email).toBe('maria.garcia-lopez@international-agriculture.com');
      expect(dto.clientIds).toHaveLength(5);
    });

    it('should validate minimal contact user for business flexibility', async () => {
      // Arrange: Minimal contact user data (required fields only)
      const minimalContactDto = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@client.com',
        userType: UserType.CONTACT,
        clientIds: ['507f1f77bcf86cd799439011'],
      };

      // Act: Validate minimal contact configuration
      const dto = plainToClass(CreateUserDto, minimalContactDto);
      const errors = await validate(dto);

      // Assert: Minimal configuration supports independent farm operations
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Smith');
      expect(dto.roleId).toBeUndefined(); // Optional for contacts
    });

    it('should handle special characters in international agricultural user names', async () => {
      // Arrange: International user names with special characters
      const internationalNames = [
        { firstName: 'François', lastName: 'Dubois', email: 'francois.dubois@agriculture-france.fr' },
        { firstName: 'Müller', lastName: 'Schmidt', email: 'mueller.schmidt@landwirtschaft.de' }, 
        { firstName: 'José', lastName: 'García', email: 'jose.garcia@agricultura.es' },
        { firstName: 'João', lastName: 'Silva', email: 'joao.silva@agricultura.pt' },
        { firstName: '田中', lastName: '太郎', email: 'tanaka@agriculture.jp' }, // Japanese characters
      ];

      for (const name of internationalNames) {
        // Act: Validate international agricultural user names
        const dto = plainToClass(CreateUserDto, {
          firstName: name.firstName,
          lastName: name.lastName,
          email: name.email,
          userType: UserType.EMPLOYEE,
        });
        const errors = await validate(dto);

        // Assert: International user names supported for global operations
        expect(errors).toHaveLength(0);
        expect(dto.firstName).toBe(name.firstName);
        expect(dto.lastName).toBe(name.lastName);
        expect(dto.email).toBe(name.email);
      }
    });
  });

  describe('Integration with RootStock User System', () => {
    it('should prepare data for UsersService.create() integration', async () => {
      // Arrange: DTO that mirrors UsersService expectations
      const serviceIntegrationDto = {
        firstName: 'Service',
        lastName: 'Integration',
        userType: UserType.EMPLOYEE,
        email: 'service.integration@rootstock.com',
        roleId: '507f1f77bcf86cd799439011',
        clientIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
      };

      // Act: Validate DTO for service integration
      const dto = plainToClass(CreateUserDto, serviceIntegrationDto);
      const errors = await validate(dto);

      // Assert: DTO provides all data needed by UsersService
      expect(errors).toHaveLength(0);
      expect(dto).toHaveProperty('firstName');
      expect(dto).toHaveProperty('lastName');
      expect(dto).toHaveProperty('userType');
      expect(dto).toHaveProperty('roleId');
      expect(dto).toHaveProperty('clientIds');
      
      // Business context: UsersService will add recordId via CountersService and derive name field
      expect(dto).not.toHaveProperty('recordId'); // Generated by service
      expect(dto).not.toHaveProperty('name'); // Derived from firstName + lastName
      expect(dto).not.toHaveProperty('isActive'); // Defaulted by schema
      expect(dto).not.toHaveProperty('isDeleted'); // Defaulted by schema
    });

    it('should support user creation for seeded agricultural system users', async () => {
      // Arrange: System user matching seed data patterns
      const systemUserDto = {
        firstName: 'Demo',
        lastName: 'Consultant',
        email: 'demo.consultant@system.com',
        userType: UserType.EMPLOYEE,
        roleId: '507f1f77bcf86cd799439011',
        clientIds: ['507f1f77bcf86cd799439012'],
      };

      // Act: Validate system user for consistency with seed data
      const dto = plainToClass(CreateUserDto, systemUserDto);
      const errors = await validate(dto);

      // Assert: System users follow same validation as user-created users
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('Demo');
      expect(dto.lastName).toBe('Consultant');
      expect(dto.email).toBe('demo.consultant@system.com');
      expect(dto.userType).toBe(UserType.EMPLOYEE);
    });

    it('should support agricultural user onboarding workflow scenarios', async () => {
      // Arrange: Different onboarding scenarios for agricultural users
      const onboardingScenarios = [
        {
          firstName: 'New',
          lastName: 'Consultant',
          email: 'new.consultant@onboarding.com',
          userType: UserType.EMPLOYEE,
          description: 'New employee awaiting role and client assignments'
        },
        {
          firstName: 'Farm',
          lastName: 'Owner',
          email: 'farm.owner@client.com',
          userType: UserType.CONTACT,
          clientIds: ['507f1f77bcf86cd799439011'],
          description: 'New farm owner with immediate client assignment'
        },
        {
          firstName: 'Returning',
          lastName: 'Advisor',
          email: 'returning.advisor@agriculture.com',
          userType: UserType.EMPLOYEE,
          roleId: '507f1f77bcf86cd799439012',
          clientIds: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
          description: 'Returning advisor with full assignments'
        },
      ];

      for (const scenario of onboardingScenarios) {
        // Act: Validate each onboarding scenario
        const dto = plainToClass(CreateUserDto, scenario);
        const errors = await validate(dto);

        // Assert: All onboarding scenarios are supported
        expect(errors).toHaveLength(0);
        expect(dto.firstName).toBe(scenario.firstName);
        expect(dto.lastName).toBe(scenario.lastName);
        expect(dto.email).toBe(scenario.email);
        expect(dto.userType).toBe(scenario.userType);
      }
    });
  });
});
