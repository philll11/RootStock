// backend/src/operations/assessments/calculations/assessment-calculator.service.ts
import { Injectable } from '@nestjs/common';
import { AssessmentSample, AssessmentSummary } from '../schemas/assessment.schema';

@Injectable()
export class AssessmentCalculatorService {

    /**
     * Pure function to calculate assessment statistics from raw samples.
     * This is the definitive Source of Truth for the application.
     */
    public calculateStats(samples: AssessmentSample[]): AssessmentSummary {
        if (!samples || samples.length === 0) {
            return {
                totalSamples: 0,
                totalFruit: 0,
                totalDamaged: 0,
                averageDamagePercentage: 0,
            };
        }

        let totalFruit = 0;
        let totalDamaged = 0;

        for (const sample of samples) {
            totalFruit += sample.totalFruit || 0;
            totalDamaged += sample.damagedFruit || 0;
        }

        // Avoid Division by Zero
        const averageDamagePercentage = totalFruit > 0 ? (totalDamaged / totalFruit) * 100 : 0;

        return {
            totalSamples: samples.length,
            totalFruit,
            totalDamaged,
            averageDamagePercentage: parseFloat(averageDamagePercentage.toFixed(2)), // Round to 2 decimal places
        };
    }
}