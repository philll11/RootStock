import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingSingleClientConstraint } from './is-existing-single-client.validator';
import { ClientsService } from '../clients.service';

const mockClientsService = {
  validateSingleClientId: jest.fn(),
};

describe('IsExistingSingleClientConstraint', () => {
  let validator: IsExistingSingleClientConstraint;

  const mockArgs: ValidationArguments = {
    value: '',
    targetName: 'CreateOrchardDto',
    object: {},
    property: 'clientId',
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingSingleClientConstraint,
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingSingleClientConstraint>(IsExistingSingleClientConstraint);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    // --- Happy Path Test ---
    it('should return true when clientId is valid and service returns true', async () => {
      const validId = '60f8f1b3b5f9f1b3b5f9f1b4';
      mockClientsService.validateSingleClientId.mockResolvedValue(true);
      
      const result = await validator.validate(validId, mockArgs);

      expect(result).toBe(true);
      expect(mockClientsService.validateSingleClientId).toHaveBeenCalledWith(validId);
      expect(mockClientsService.validateSingleClientId).toHaveBeenCalledTimes(1);
    });

    // --- Negative Tests ---
    it('should return false when clientId is invalid and service returns false', async () => {
      const invalidId = '000000000000000000000000';
      mockClientsService.validateSingleClientId.mockResolvedValue(false);

      const result = await validator.validate(invalidId, mockArgs);
      
      expect(result).toBe(false);
      expect(mockClientsService.validateSingleClientId).toHaveBeenCalledWith(invalidId);
    });

    it('should return false for an empty string without calling the service', async () => {
      const result = await validator.validate('', mockArgs);
      expect(result).toBe(false);
      expect(mockClientsService.validateSingleClientId).not.toHaveBeenCalled();
    });

    it('should return false for a null value without calling the service', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(false);
      expect(mockClientsService.validateSingleClientId).not.toHaveBeenCalled();
    });

    it('should return false for an undefined value without calling the service', async () => {
      const result = await validator.validate(undefined as any, mockArgs);
      expect(result).toBe(false);
      expect(mockClientsService.validateSingleClientId).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = 'invalid-id-123';
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'Client with ID "invalid-id-123" does not exist, is inactive, or has been deleted.',
      );
    });
  });
});