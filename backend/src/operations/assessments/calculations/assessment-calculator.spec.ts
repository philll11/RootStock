// backend/src/operations/assessments/calculations/assessment-calculator.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentCalculatorService } from './assessment-calculator.service';

describe('AssessmentCalculatorService', () => {
  let service: AssessmentCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentCalculatorService],
    }).compile();

    service = module.get<AssessmentCalculatorService>(AssessmentCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate correct percentage for mixed samples', () => {
    const samples = [
      { rowNumber: 1, totalFruit: 100, damagedFruit: 10 }, // 10%
      { rowNumber: 2, totalFruit: 100, damagedFruit: 20 }, // 20%
    ];

    const result = service.calculateStats(samples);

    expect(result.totalSamples).toBe(2);
    expect(result.totalFruit).toBe(200);
    expect(result.totalDamaged).toBe(30);
    expect(result.averageDamagePercentage).toBe(15.00); // (30/200)*100
  });

  it('should handle division by zero (0 fruit)', () => {
    const samples = [{ rowNumber: 1, totalFruit: 0, damagedFruit: 0 }];
    const result = service.calculateStats(samples);
    expect(result.averageDamagePercentage).toBe(0);
  });
});