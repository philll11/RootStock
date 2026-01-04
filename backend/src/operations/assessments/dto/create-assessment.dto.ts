// backend/src/operations/assessments/dto/create-assessment.dto.ts
import { IsArray, IsDate, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentSampleDto } from './assessment-sample.dto';
import { AssessmentType } from '../schemas/assessment.schema';

export class CreateAssessmentDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsEnum(AssessmentType)
    @IsNotEmpty()
    readonly type: AssessmentType;

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