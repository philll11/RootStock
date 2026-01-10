// backend/src/operations/assessments/dto/assessment-sample.dto.ts
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class AssessmentSampleDto {
    @IsMongoId()
    @IsOptional()
    readonly _id?: string;

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