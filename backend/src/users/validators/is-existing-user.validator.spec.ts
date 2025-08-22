import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingUserConstraint } from './is-existing-user.validator';
import { UsersService } from '../users.service';

// Mock the UsersService to isolate the validator's logic
const mockUsersService = {
  validateUserId: jest.fn(),
};

describe('IsExistingUserConstraint', () => {
  let validator: IsExistingUserConstraint;

  const mockArgs: ValidationArguments = {
    value: '',
    targetName: 'SomeFutureDto',
    object: {},
    property: 'managerId', // Example property name
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingUserConstraint,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingUserConstraint>(IsExistingUserConstraint);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    it('should PASS when userId is valid and service returns true', async () => {
      const validId = '60f8f1b3b5f9f1b3b5f9f1b3';
      mockUsersService.validateUserId.mockResolvedValue(true);
      const result = await validator.validate(validId, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateUserId).toHaveBeenCalledWith(validId);
    });

    it('should FAIL when userId is invalid and service returns false', async () => {
      const invalidId = '000000000000000000000000';
      mockUsersService.validateUserId.mockResolvedValue(false);
      const result = await validator.validate(invalidId, mockArgs);
      expect(result).toBe(false);
      expect(mockUsersService.validateUserId).toHaveBeenCalledWith(invalidId);
    });

    it('should PASS for a null value without calling the service', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateUserId).not.toHaveBeenCalled();
    });

    it('should PASS for an undefined value without calling the service', async () => {
      const result = await validator.validate(undefined as any, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateUserId).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = 'invalid-user-id';
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'User with ID "invalid-user-id" does not exist, is inactive, or has been deleted.',
      );
    });
  });
});