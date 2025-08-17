import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CountersService } from './counters.service';
import { Counter } from './schemas/counter.schema';
import { UpdateCounterDto } from './dto/update-counter.dto';

describe('CountersService', () => {
  let service: CountersService;
  let mockCounterModel: any;

  const mockCounterDoc = {
    _id: 'subsidiary',
    prefix: 'SUB',
    sequence_value: 5,
    exec: jest.fn(),
  };

  beforeEach(async () => {
    mockCounterModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountersService,
        {
          provide: getModelToken(Counter.name),
          useValue: mockCounterModel,
        },
      ],
    }).compile();

    service = module.get<CountersService>(CountersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all counter documents', async () => {
      // Arrange
      const expectedCounters = [
        { _id: 'subsidiary', prefix: 'SUB', sequence_value: 1 },
        { _id: 'client', prefix: 'CLI', sequence_value: 5 },
        { _id: 'user', prefix: 'USR', sequence_value: 0 },
      ];
      mockCounterModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expectedCounters),
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockCounterModel.find).toHaveBeenCalledWith();
      expect(result).toEqual(expectedCounters);
    });

    it('should return empty array when no counters exist', async () => {
      // Arrange
      mockCounterModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors during findAll', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockCounterModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      });

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });
  });

  describe('update', () => {
    const updateDto: UpdateCounterDto = { prefix: 'NEWSUB' };

    it('should update counter prefix successfully', async () => {
      // Arrange
      const updatedCounter = { _id: 'subsidiary', prefix: 'NEWSUB', sequence_value: 5 };
      mockCounterModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCounter),
      });

      // Act
      const result = await service.update('subsidiary', updateDto);

      // Assert
      expect(mockCounterModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'subsidiary',
        { $set: { prefix: 'NEWSUB' } },
        { new: true }
      );
      expect(result).toEqual(updatedCounter);
    });

    it('should throw NotFoundException when counter does not exist', async () => {
      // Arrange
      mockCounterModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.update('nonexistent', updateDto))
        .rejects
        .toThrow(new NotFoundException('Counter with ID "nonexistent" not found.'));

      expect(mockCounterModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'nonexistent',
        { $set: { prefix: 'NEWSUB' } },
        { new: true }
      );
    });

    it('should handle database errors during update', async () => {
      // Arrange
      const dbError = new Error('Database update failed');
      mockCounterModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      });

      // Act & Assert
      await expect(service.update('subsidiary', updateDto))
        .rejects
        .toThrow('Database update failed');
    });

    it('should handle edge case with empty string prefix', async () => {
      // Arrange
      const emptyPrefixDto: UpdateCounterDto = { prefix: '' };
      const updatedCounter = { _id: 'subsidiary', prefix: '', sequence_value: 5 };
      mockCounterModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCounter),
      });

      // Act
      const result = await service.update('subsidiary', emptyPrefixDto);

      // Assert
      expect(mockCounterModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'subsidiary',
        { $set: { prefix: '' } },
        { new: true }
      );
      expect(result.prefix).toBe('');
    });
  });

  describe('getNextSequenceValue', () => {
    it('should increment sequence value for existing counter', async () => {
      // Arrange
      const existingCounter = { _id: 'subsidiary', prefix: 'SUB', sequence_value: 6 };
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingCounter),
      });

      // Act
      const result = await service.getNextSequenceValue('subsidiary', 'SUB');

      // Assert
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'subsidiary' },
        {
          $inc: { sequence_value: 1 },
          $setOnInsert: { prefix: 'SUB' },
        },
        { returnDocument: 'after', upsert: true, new: true }
      );
      expect(result).toEqual(existingCounter);
    });

    it('should create new counter with default prefix when not exists', async () => {
      // Arrange
      const newCounter = { _id: 'newresource', prefix: 'NEW', sequence_value: 1 };
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(newCounter),
      });

      // Act
      const result = await service.getNextSequenceValue('newresource', 'NEW');

      // Assert
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'newresource' },
        {
          $inc: { sequence_value: 1 },
          $setOnInsert: { prefix: 'NEW' },
        },
        { returnDocument: 'after', upsert: true, new: true }
      );
      expect(result).toEqual(newCounter);
      expect(result.sequence_value).toBe(1);
    });

    it('should handle concurrent calls correctly (atomic operation)', async () => {
      // Arrange - Simulate two concurrent calls
      const counter1 = { _id: 'subsidiary', prefix: 'SUB', sequence_value: 10 };
      const counter2 = { _id: 'subsidiary', prefix: 'SUB', sequence_value: 11 };
      
      mockCounterModel.findOneAndUpdate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(counter1),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(counter2),
        });

      // Act - Simulate concurrent calls
      const [result1, result2] = await Promise.all([
        service.getNextSequenceValue('subsidiary', 'SUB'),
        service.getNextSequenceValue('subsidiary', 'SUB'),
      ]);

      // Assert - Both calls should use atomic operation
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(result1.sequence_value).toBe(10);
      expect(result2.sequence_value).toBe(11);
    });

    it('should handle different resource types correctly', async () => {
      // Arrange
      const clientCounter = { _id: 'client', prefix: 'CLI', sequence_value: 1 };
      const userCounter = { _id: 'user', prefix: 'USR', sequence_value: 1 };

      mockCounterModel.findOneAndUpdate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(clientCounter),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(userCounter),
        });

      // Act
      const [clientResult, userResult] = await Promise.all([
        service.getNextSequenceValue('client', 'CLI'),
        service.getNextSequenceValue('user', 'USR'),
      ]);

      // Assert
      expect(clientResult._id).toBe('client');
      expect(clientResult.prefix).toBe('CLI');
      expect(userResult._id).toBe('user');
      expect(userResult.prefix).toBe('USR');
    });

    it('should handle database errors during sequence generation', async () => {
      // Arrange
      const dbError = new Error('Database atomic operation failed');
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      });

      // Act & Assert
      await expect(service.getNextSequenceValue('subsidiary', 'SUB'))
        .rejects
        .toThrow('Database atomic operation failed');
    });

    it('should preserve existing prefix when counter already exists', async () => {
      // Arrange - Counter exists with different prefix than default
      const existingCounter = { _id: 'subsidiary', prefix: 'CUSTOM', sequence_value: 15 };
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingCounter),
      });

      // Act - Try to get sequence with different default prefix
      const result = await service.getNextSequenceValue('subsidiary', 'SUB');

      // Assert - Should keep existing prefix 'CUSTOM', not use default 'SUB'
      expect(result.prefix).toBe('CUSTOM');
      expect(result.sequence_value).toBe(15);
    });

    it('should handle edge case with very high sequence numbers', async () => {
      // Arrange
      const highSequenceCounter = { _id: 'subsidiary', prefix: 'SUB', sequence_value: 999999 };
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(highSequenceCounter),
      });

      // Act
      const result = await service.getNextSequenceValue('subsidiary', 'SUB');

      // Assert
      expect(result.sequence_value).toBe(999999);
    });

    it('should handle upsert operation when counter does not exist', async () => {
      // Arrange
      const newCounter = { _id: 'brand-new', prefix: 'NEW', sequence_value: 1 };
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(newCounter),
      });

      // Act
      const result = await service.getNextSequenceValue('brand-new', 'NEW');

      // Assert
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'brand-new' },
        {
          $inc: { sequence_value: 1 },
          $setOnInsert: { prefix: 'NEW' },
        },
        { returnDocument: 'after', upsert: true, new: true }
      );
      expect(result._id).toBe('brand-new');
      expect(result.sequence_value).toBe(1);
    });

    it('should handle null response from database (edge case)', async () => {
      // Arrange
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      const result = await service.getNextSequenceValue('subsidiary', 'SUB');
      expect(result).toBeNull();
    });

    it('should handle database timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Database operation timed out');
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(timeoutError),
      });

      // Act & Assert
      await expect(service.getNextSequenceValue('subsidiary', 'SUB'))
        .rejects
        .toThrow('Database operation timed out');
    });

    it('should handle MongoDB duplicate key errors', async () => {
      // Arrange
      const duplicateError = new Error('E11000 duplicate key error');
      duplicateError.name = 'MongoServerError';
      (duplicateError as any).code = 11000;
      mockCounterModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(duplicateError),
      });

      // Act & Assert
      await expect(service.getNextSequenceValue('subsidiary', 'SUB'))
        .rejects
        .toThrow('E11000 duplicate key error');
    });
  });

  describe('edge cases and error boundaries', () => {
    describe('findAll edge cases', () => {
      it('should handle large datasets efficiently', async () => {
        // Arrange
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          _id: `resource${i}`,
          prefix: `RES${i}`,
          sequence_value: i,
        }));
        mockCounterModel.find.mockReturnValue({
          exec: jest.fn().mockResolvedValue(largeDataset),
        });

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toHaveLength(1000);
        expect(result[0]._id).toBe('resource0');
        expect(result[999]._id).toBe('resource999');
      });

      it('should handle database connection errors gracefully', async () => {
        // Arrange
        const connectionError = new Error('Connection to MongoDB failed');
        connectionError.name = 'MongoNetworkError';
        mockCounterModel.find.mockReturnValue({
          exec: jest.fn().mockRejectedValue(connectionError),
        });

        // Act & Assert
        await expect(service.findAll()).rejects.toThrow('Connection to MongoDB failed');
      });
    });

    describe('update edge cases', () => {
      it('should handle concurrent update attempts', async () => {
        // Arrange
        const updateDto = { prefix: 'CONCURRENT' };
        const updatedCounter = { _id: 'subsidiary', prefix: 'CONCURRENT', sequence_value: 5 };
        
        // Simulate successful update after retry
        mockCounterModel.findByIdAndUpdate
          .mockReturnValueOnce({
            exec: jest.fn().mockRejectedValue(new Error('WriteConflict')),
          })
          .mockReturnValueOnce({
            exec: jest.fn().mockResolvedValue(updatedCounter),
          });

        // Act & Assert - First call should fail, testing error handling
        await expect(service.update('subsidiary', updateDto))
          .rejects
          .toThrow('WriteConflict');
      });

      it('should handle update with special prefix characters', async () => {
        // Arrange
        const specialPrefixDto = { prefix: 'PREFIX-2024_v1.0' };
        const updatedCounter = { _id: 'subsidiary', prefix: 'PREFIX-2024_v1.0', sequence_value: 5 };
        mockCounterModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedCounter),
        });

        // Act
        const result = await service.update('subsidiary', specialPrefixDto);

        // Assert
        expect(result.prefix).toBe('PREFIX-2024_v1.0');
      });

      it('should handle update with maximum length prefix', async () => {
        // Arrange
        const maxLengthPrefix = 'A'.repeat(10); // Max allowed by DTO
        const updateDto = { prefix: maxLengthPrefix };
        const updatedCounter = { _id: 'subsidiary', prefix: maxLengthPrefix, sequence_value: 5 };
        mockCounterModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedCounter),
        });

        // Act
        const result = await service.update('subsidiary', updateDto);

        // Assert
        expect(result.prefix).toBe(maxLengthPrefix);
        expect(result.prefix.length).toBe(10);
      });
    });

    describe('getNextSequenceValue stress testing', () => {
      it('should maintain atomic behavior under simulated high load', async () => {
        // Arrange - Simulate multiple rapid calls
        const sequenceResults = [
          { _id: 'load-test', prefix: 'LOAD', sequence_value: 1 },
          { _id: 'load-test', prefix: 'LOAD', sequence_value: 2 },
          { _id: 'load-test', prefix: 'LOAD', sequence_value: 3 },
          { _id: 'load-test', prefix: 'LOAD', sequence_value: 4 },
          { _id: 'load-test', prefix: 'LOAD', sequence_value: 5 },
        ];

        sequenceResults.forEach((result, index) => {
          mockCounterModel.findOneAndUpdate
            .mockReturnValueOnce({
              exec: jest.fn().mockResolvedValue(result),
            });
        });

        // Act - Simulate 5 rapid concurrent calls
        const promises = Array.from({ length: 5 }, () => 
          service.getNextSequenceValue('load-test', 'LOAD')
        );
        const results = await Promise.all(promises);

        // Assert - Each call should get incremental sequence
        expect(results).toHaveLength(5);
        results.forEach((result, index) => {
          expect(result.sequence_value).toBe(index + 1);
        });
      });
    });
  });

  describe('service integration', () => {
    it('should be properly injectable with dependencies', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CountersService);
    });
  });
});