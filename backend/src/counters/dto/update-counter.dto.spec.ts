import { validate, validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCounterDto } from './update-counter.dto';

describe('UpdateCounterDto', () => {
  let dto: UpdateCounterDto;

  beforeEach(() => {
    dto = new UpdateCounterDto();
  });

  // Helper function to test transformation + validation
  const validateTransformed = async (plainObject: any) => {
    const transformed = plainToInstance(UpdateCounterDto, plainObject);
    return await validate(transformed);
  };

  describe('prefix field validation', () => {
    it('should SUCCEED with valid prefix', async () => {
      // Arrange
      dto.prefix = 'SUB';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should SUCCEED with maximum length prefix (10 characters)', async () => {
      // Arrange
      dto.prefix = 'ABCDEFGHIJ'; // Exactly 10 characters

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should FAIL with empty string prefix', async () => {
      // Arrange
      dto.prefix = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should FAIL with null prefix', async () => {
      // Arrange
      dto.prefix = null as any;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should FAIL with undefined prefix', async () => {
      // Arrange
      // dto.prefix is undefined by default

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should FAIL with non-string prefix', async () => {
      // Arrange
      dto.prefix = 123 as any;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should FAIL with prefix exceeding maximum length (11 characters)', async () => {
      // Arrange
      dto.prefix = 'ABCDEFGHIJK'; // 11 characters, exceeds 10 limit

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should SUCCEED with special characters in prefix', async () => {
      // Arrange
      dto.prefix = 'SUB-V2';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should SUCCEED with numeric characters in prefix', async () => {
      // Arrange
      dto.prefix = 'SUB123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should SUCCEED with single character prefix', async () => {
      // Arrange
      dto.prefix = 'S';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should SUCCEED and trim whitespace around valid prefix', async () => {
      // Arrange - Test transformation behavior
      const plainObject = { prefix: '  SUB  ' }; // Whitespace around valid prefix

      // Act
      const errors = await validateTransformed(plainObject);

      // Assert
      expect(errors.length).toBe(0);
      
      // Verify the transformation worked
      const transformed = plainToInstance(UpdateCounterDto, plainObject);
      expect(transformed.prefix).toBe('SUB'); // Should be trimmed
    });

    it('should SUCCEED after trimming whitespace-only prefix to empty and then fail validation', async () => {
      // Arrange - Use the helper function to test transformation
      const plainObject = { prefix: '   ' }; // Only spaces - will be trimmed to empty string

      // Act
      const errors = await validateTransformed(plainObject);

      // Assert - Should fail because after trimming it becomes empty string
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('edge cases', () => {
    it('should handle prefix with numbers and underscores', async () => {
      // Arrange
      dto.prefix = 'SUB_123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should handle prefix with mixed case', async () => {
      // Arrange
      dto.prefix = 'SubSidiary';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should handle prefix at exact boundary (10 chars)', async () => {
      // Arrange
      dto.prefix = 'SUB_2024_V'; // 10 characters

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  describe('multiple validation errors', () => {
    it('should return multiple constraint violations for invalid input', async () => {
      // Arrange
      dto.prefix = null as any;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(1);
      const constraints = Object.keys(errors[0].constraints || {});
      expect(constraints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('dto construction', () => {
    it('should create DTO instance successfully', () => {
      // Act
      const newDto = new UpdateCounterDto();

      // Assert
      expect(newDto).toBeInstanceOf(UpdateCounterDto);
      expect(newDto.prefix).toBeUndefined();
    });

    it('should allow property assignment', () => {
      // Act
      const newDto = new UpdateCounterDto();
      newDto.prefix = 'TEST';

      // Assert
      expect(newDto.prefix).toBe('TEST');
    });
  });
});
