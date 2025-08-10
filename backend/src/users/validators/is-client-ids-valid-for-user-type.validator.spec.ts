import { ValidationArguments } from 'class-validator';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserType } from '../schemas/user.schema';
import { IsClientIdsValidForUserTypeConstraint } from './is-client-ids-valid-for-user-type.validator';

describe('IsClientIdsValidForUserTypeConstraint', () => {
    let validator: IsClientIdsValidForUserTypeConstraint;

    const mockArgs: ValidationArguments = {
        value: null,
        targetName: '',
        object: {},
        property: '',
        constraints: [],
    };

    // A base DTO with all required properties to satisfy the type.
    const baseDto: CreateUserDto = {
        recordId: 'UNIT-TEST-01',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.EMPLOYEE,
    };

    beforeEach(() => {
        validator = new IsClientIdsValidForUserTypeConstraint();
    });

    it('should be defined', () => {
        expect(validator).toBeDefined();
    });

    describe('Validation Logic', () => {
        // Test case: Creating a user with 1 clientIds for 'contact' userType (SUCCESS)
        it('should PASS when userType is "contact" and one clientId is provided', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.CONTACT,
                clientIds: ['60f8f1b3b5f9f1b3b5f9f1b3'],
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(true);
        });

        // Test case: Creating a user with no clientIds for 'contact' userType (FAILURE)
        it('should FAIL when userType is "contact" and no clientIds are provided (empty array)', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.CONTACT,
                clientIds: [], // Invalid state
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(false);
        });

        // Test case: Creating a user with undefined clientIds for 'contact' userType (FAILURE)
        it('should FAIL when userType is "contact" and clientIds is undefined', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.CONTACT,
                // clientIds is undefined, invalid state
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(false);
        });

        // Test case: Creating a user with multiple clientIds for 'contact' userType (FAILURE)
        it('should FAIL when userType is "contact" and more than one clientId is provided', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.CONTACT,
                clientIds: ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4'], // Invalid state
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(false);
        });

        // Test case: Creating a user with no clientIds for 'employee' userType (SUCCESS)
        it('should PASS when userType is "employee" and no clientIds are provided', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.EMPLOYEE,
                clientIds: [], // Valid state for an employee
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(true);
        });

        // Tes case: Creating a user with multiple clientIds for 'employee' userType (SUCCESS)
        it('should PASS when userType is "employee" and multiple clientIds are provided', () => {
            const dto: CreateUserDto = {
                ...baseDto,
                userType: UserType.EMPLOYEE,
                clientIds: ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4'], // Valid state for an employee
            };
            mockArgs.object = dto;
            expect(validator.validate(null, mockArgs)).toBe(true);
        });
    });

    describe('Default Message', () => {
        // Test case: Default message for 'contact' userType with no clientIds (FAILURE)
        it('should return the correct error message for "contact" users', () => {
            const dto: CreateUserDto = { ...baseDto, userType: UserType.CONTACT };
            mockArgs.object = dto;
            const message = validator.defaultMessage(mockArgs);
            expect(message).toBe('Users with type "contact" must be assigned to exactly one client.');
        });
    });
});