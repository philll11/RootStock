import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingClientConstraint } from './is-existing-client.validator';
import { ClientsService } from '../clients.service';

const mockClientsService = {
  validateClientIds: jest.fn(),
};

describe('IsExistingClientConstraint', () => {
  let validator: IsExistingClientConstraint;

  const mockArgs: ValidationArguments = {
    value: [],
    targetName: 'CreateUserDto',
    object: {},
    property: 'clientIds',
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingClientConstraint,
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingClientConstraint>(IsExistingClientConstraint);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    it('should PASS when clientIds array is valid and service returns true', async () => {
      const validIds = ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4'];
      mockClientsService.validateClientIds.mockResolvedValue(true);
      const result = await validator.validate(validIds, mockArgs);
      expect(result).toBe(true);
      expect(mockClientsService.validateClientIds).toHaveBeenCalledWith(validIds);
    });

    it('should FAIL when clientIds array is invalid and service returns false', async () => {
      const invalidIds = ['000000000000000000000000'];
      mockClientsService.validateClientIds.mockResolvedValue(false);
      const result = await validator.validate(invalidIds, mockArgs);
      expect(result).toBe(false);
      expect(mockClientsService.validateClientIds).toHaveBeenCalledWith(invalidIds);
    });

    it('should PASS for an empty array without calling the service', async () => {
      const result = await validator.validate([], mockArgs);
      expect(result).toBe(true);
      expect(mockClientsService.validateClientIds).not.toHaveBeenCalled();
    });

    it('should PASS for a null value without calling the service', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(true);
      expect(mockClientsService.validateClientIds).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = ['invalid-id-123', 'invalid-id-456'];
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'One or more client IDs in [invalid-id-123,invalid-id-456] do not exist, are inactive, or have been deleted.',
      );
    });
  });
});