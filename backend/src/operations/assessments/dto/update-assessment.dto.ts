// backend/src/operations/assessments/dto/update-assessment.dto.ts
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAssessmentDto } from './create-assessment.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AssessmentStatus } from '../schemas/assessment.schema';

// We use OmitType to strictly ensure blockId cannot be passed in an update (Immutable Context)
export class UpdateAssessmentDto extends PartialType(
  OmitType(CreateAssessmentDto, ['blockId'] as const),
) {
  @IsEnum(AssessmentStatus)
  @IsOptional()
  readonly status?: AssessmentStatus;

  /**
   * MANDATORY if the Assessment is currently in COMPLETED status.
   */
  @IsString()
  @IsOptional()
  readonly changeReason?: string;

  @IsNumber()
  @IsNotEmpty()
  readonly __v: number;

  @IsOptional()
  readonly isActive?: boolean;
}