// backend/src/operations/assessments/dto/create-assessment.dto.ts
import { IsArray, IsDate, IsMongoId, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentSampleDto } from './assessment-sample.dto';

export class CreateAssessmentDto {
    @IsMongoId()
    @IsNotEmpty()
    readonly blockId: string;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    readonly date: Date;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => AssessmentSampleDto)
    readonly samples?: AssessmentSampleDto[];
}