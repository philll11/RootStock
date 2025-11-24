import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingRoleConstraint } from './is-existing-role.validator';
import { RolesService } from '../roles.service';

// Mock the RolesService and its method
const mockRolesService = {
  isRoleExistingAndActive: jest.fn(),
};

describe('IsExistingRoleConstraint', () => {
  let validator: IsExistingRoleConstraint;

  const mockArgs: ValidationArguments = {
    value: '',
    targetName: 'CreateUserDto',
    object: {},
    property: 'roleId',
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingRoleConstraint,
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingRoleConstraint>(IsExistingRoleConstraint);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    it('should PASS when roleId is valid and service returns true', async () => {
      const validId = '60f8f1b3b5f9f1b3b5f9f1b3';
      mockRolesService.isRoleExistingAndActive.mockResolvedValue(true);
      const result = await validator.validate(validId, mockArgs);
      expect(result).toBe(true);
      expect(mockRolesService.isRoleExistingAndActive).toHaveBeenCalledWith(validId);
    });

    it('should FAIL when roleId is invalid and service returns false', async () => {
      const invalidId = '000000000000000000000000';
      mockRolesService.isRoleExistingAndActive.mockResolvedValue(false);
      const result = await validator.validate(invalidId, mockArgs);
      expect(result).toBe(false);
      expect(mockRolesService.isRoleExistingAndActive).toHaveBeenCalledWith(invalidId);
    });

    it('should PASS when roleId is null', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(true);
      expect(mockRolesService.isRoleExistingAndActive).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = 'invalid-role-id';
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe('Role with ID "invalid-role-id" does not exist or is not active.');
    });
  });
});