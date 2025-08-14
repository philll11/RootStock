import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingContactUsersConstraint } from './is-existing-contact-users.validator';
import { UsersService } from '../users.service';

const mockUsersService = {
  validateContactUserIds: jest.fn(),
};

describe('IsExistingContactUsersConstraint', () => {
  let validator: IsExistingContactUsersConstraint;

  // Mock arguments object for testing the default message
  const mockArgs: ValidationArguments = {
    value: [],
    targetName: 'CreateOrchardDto',
    object: {},
    property: 'userIds', // The property being validated is an array of user IDs
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingContactUsersConstraint,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingContactUsersConstraint>(IsExistingContactUsersConstraint);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    // --- Happy Path ---
    it('should return true when userIds is a valid array and service returns true', async () => {
      const validIds = ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4'];
      mockUsersService.validateContactUserIds.mockResolvedValue(true);
      const result = await validator.validate(validIds, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateContactUserIds).toHaveBeenCalledWith(validIds);
    });

    // --- Negative Tests ---
    it('should return false when userIds is an invalid array and service returns false', async () => {
      const invalidIds = ['000000000000000000000000'];
      mockUsersService.validateContactUserIds.mockResolvedValue(false);
      const result = await validator.validate(invalidIds, mockArgs);
      expect(result).toBe(false);
      expect(mockUsersService.validateContactUserIds).toHaveBeenCalledWith(invalidIds);
    });

    it('should return true for an empty array without calling the service', async () => {
      const result = await validator.validate([], mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateContactUserIds).not.toHaveBeenCalled();
    });

    it('should return true for a null value without calling the service', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateContactUserIds).not.toHaveBeenCalled();
    });

    it('should return true for an undefined value without calling the service', async () => {
      const result = await validator.validate(undefined as any, mockArgs);
      expect(result).toBe(true);
      expect(mockUsersService.validateContactUserIds).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = ['id1', 'id2'];
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        "One or more user IDs in [id1,id2] do not exist, are inactive, or are not 'contact' type users.",
      );
    });
  });
});