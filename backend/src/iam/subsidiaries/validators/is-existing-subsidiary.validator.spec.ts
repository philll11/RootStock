import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import { IsExistingSubsidiaryConstraint } from './is-existing-subsidiary.validator';
import { SubsidiariesService } from '../subsidiaries.service';

const mockSubsidiariesService = {
  isExistingAndActive: jest.fn(),
};

describe('IsExistingSubsidiaryConstraint', () => {
  let validator: IsExistingSubsidiaryConstraint;

  const mockArgs: ValidationArguments = {
    value: '',
    targetName: 'CreateClientDto',
    object: {},
    property: 'subsidiaryId',
    constraints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsExistingSubsidiaryConstraint,
        {
          provide: SubsidiariesService,
          useValue: mockSubsidiariesService,
        },
      ],
    }).compile();

    validator = module.get<IsExistingSubsidiaryConstraint>(IsExistingSubsidiaryConstraint);
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    it('should PASS when subsidiaryId is valid and service returns true', async () => {
      const validId = '60f8f1b3b5f9f1b3b5f9f1b3';
      mockSubsidiariesService.isExistingAndActive.mockResolvedValue(true);
      const result = await validator.validate(validId, mockArgs);
      expect(result).toBe(true);
      expect(mockSubsidiariesService.isExistingAndActive).toHaveBeenCalledWith(validId);
    });

    it('should FAIL when subsidiaryId is invalid and service returns false', async () => {
      const invalidId = '000000000000000000000000';
      mockSubsidiariesService.isExistingAndActive.mockResolvedValue(false);
      const result = await validator.validate(invalidId, mockArgs);
      expect(result).toBe(false);
      expect(mockSubsidiariesService.isExistingAndActive).toHaveBeenCalledWith(invalidId);
    });

    it('should PASS when subsidiaryId is null, as it is an optional field', async () => {
      const result = await validator.validate(null as any, mockArgs);
      expect(result).toBe(true);
      expect(mockSubsidiariesService.isExistingAndActive).not.toHaveBeenCalled();
    });

    it('should PASS when subsidiaryId is undefined, as it is an optional field', async () => {
      const result = await validator.validate(undefined as any, mockArgs);
      expect(result).toBe(true);
      expect(mockSubsidiariesService.isExistingAndActive).not.toHaveBeenCalled();
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      mockArgs.value = 'invalid-id-123';
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'Subsidiary with ID "invalid-id-123" does not exist, is inactive, or has been deleted.',
      );
    });
  });
});