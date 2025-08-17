import { Test, TestingModule } from '@nestjs/testing';
import { CountersController } from './counters.controller';
import { CountersService } from './counters.service';
import { UpdateCounterDto } from './dto/update-counter.dto';
import { Counter } from './schemas/counter.schema';

describe('CountersController', () => {
  let controller: CountersController;
  let service: CountersService;

  const mockCountersService = {
    findAll: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountersController],
      providers: [
        {
          provide: CountersService,
          useValue: mockCountersService,
        },
      ],
    }).compile();

    controller = module.get<CountersController>(CountersController);
    service = module.get<CountersService>(CountersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all counters', async () => {
      // Arrange
      const expectedCounters: Counter[] = [
        { _id: 'subsidiary', prefix: 'SUB', sequence_value: 1 } as Counter,
        { _id: 'client', prefix: 'CLI', sequence_value: 5 } as Counter,
        { _id: 'user', prefix: 'USR', sequence_value: 0 } as Counter,
      ];
      mockCountersService.findAll.mockResolvedValue(expectedCounters);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedCounters);
    });

    it('should return empty array when no counters exist', async () => {
      // Arrange
      mockCountersService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockCountersService.findAll.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow('Service error');
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const counterId = 'subsidiary';
    const updateDto: UpdateCounterDto = { prefix: 'NEWSUB' };

    it('should update counter and return updated document', async () => {
      // Arrange
      const updatedCounter: Counter = {
        _id: 'subsidiary',
        prefix: 'NEWSUB',
        sequence_value: 5,
      } as Counter;
      mockCountersService.update.mockResolvedValue(updatedCounter);

      // Act
      const result = await controller.update(counterId, updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(counterId, updateDto);
      expect(result).toEqual(updatedCounter);
    });

    it('should handle different counter types correctly', async () => {
      // Arrange
      const clientUpdateDto: UpdateCounterDto = { prefix: 'NEWCLI' };
      const updatedClientCounter: Counter = {
        _id: 'client',
        prefix: 'NEWCLI',
        sequence_value: 10,
      } as Counter;
      mockCountersService.update.mockResolvedValue(updatedClientCounter);

      // Act
      const result = await controller.update('client', clientUpdateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith('client', clientUpdateDto);
      expect(result).toEqual(updatedClientCounter);
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const notFoundError = new Error('Counter with ID "nonexistent" not found.');
      mockCountersService.update.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.update('nonexistent', updateDto))
        .rejects
        .toThrow('Counter with ID "nonexistent" not found.');
      expect(service.update).toHaveBeenCalledWith('nonexistent', updateDto);
    });

    it('should propagate other service errors', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      mockCountersService.update.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.update(counterId, updateDto))
        .rejects
        .toThrow('Database connection failed');
      expect(service.update).toHaveBeenCalledWith(counterId, updateDto);
    });

    it('should handle edge cases with empty string prefix', async () => {
      // Arrange
      const emptyPrefixDto: UpdateCounterDto = { prefix: '' };
      const updatedCounter: Counter = {
        _id: 'subsidiary',
        prefix: '',
        sequence_value: 5,
      } as Counter;
      mockCountersService.update.mockResolvedValue(updatedCounter);

      // Act
      const result = await controller.update(counterId, emptyPrefixDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(counterId, emptyPrefixDto);
      expect(result.prefix).toBe('');
    });

    it('should handle special characters in prefix', async () => {
      // Arrange
      const specialPrefixDto: UpdateCounterDto = { prefix: 'SUB-V2' };
      const updatedCounter: Counter = {
        _id: 'subsidiary',
        prefix: 'SUB-V2',
        sequence_value: 5,
      } as Counter;
      mockCountersService.update.mockResolvedValue(updatedCounter);

      // Act
      const result = await controller.update(counterId, specialPrefixDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(counterId, specialPrefixDto);
      expect(result.prefix).toBe('SUB-V2');
    });
  });

  describe('controller integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of CountersController', () => {
      expect(controller).toBeInstanceOf(CountersController);
    });

    it('should have injected CountersService', () => {
      expect(service).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.update).toBe('function');
    });
  });

  describe('method signatures and parameter handling', () => {
    it('should call findAll with no parameters', async () => {
      // Arrange
      mockCountersService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll();

      // Assert
      expect(service.findAll).toHaveBeenCalledWith();
    });

    it('should call update with correct parameter order', async () => {
      // Arrange
      const testId = 'test-counter';
      const testDto: UpdateCounterDto = { prefix: 'TEST' };
      const mockResult = { _id: testId, prefix: 'TEST', sequence_value: 1 } as Counter;
      mockCountersService.update.mockResolvedValue(mockResult);

      // Act
      await controller.update(testId, testDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(testId, testDto);
    });

    it('should handle undefined/null parameters appropriately', async () => {
      // Arrange
      const undefinedDto = undefined as any;
      const serviceError = new Error('Invalid DTO');
      mockCountersService.update.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.update('subsidiary', undefinedDto))
        .rejects
        .toThrow('Invalid DTO');
    });
  });

  describe('async behavior', () => {
    it('should handle async findAll correctly', async () => {
      // Arrange
      const promise = Promise.resolve([]);
      mockCountersService.findAll.mockReturnValue(promise);

      // Act
      const result = controller.findAll();

      // Assert
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toEqual([]);
    });

    it('should handle async update correctly', async () => {
      // Arrange
      const updateDto: UpdateCounterDto = { prefix: 'ASYNC' };
      const expectedResult = { _id: 'test', prefix: 'ASYNC', sequence_value: 1 } as Counter;
      const promise = Promise.resolve(expectedResult);
      mockCountersService.update.mockReturnValue(promise);

      // Act
      const result = controller.update('test', updateDto);

      // Assert
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toEqual(expectedResult);
    });
  });
});