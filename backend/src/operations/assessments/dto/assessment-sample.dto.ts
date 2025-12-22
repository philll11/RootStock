// backend/src/operations/assessments/dto/assessment-sample.dto.ts
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AssessmentSampleDto {
    @IsNumber()
    @IsNotEmpty()
    readonly rowNumber: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    readonly totalFruit: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    readonly damagedFruit: number;
}