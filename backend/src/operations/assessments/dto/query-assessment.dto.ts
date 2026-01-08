// backend/src/operations/assessments/dto/query-assessment.dto.ts
import { IsEnum, IsMongoId, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from '../schemas/assessment.schema';

export class QueryAssessmentDto {
    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsMongoId()
    @IsOptional()
    readonly blockId?: string;

    @IsEnum(AssessmentStatus)
    @IsOptional()
    readonly status?: AssessmentStatus;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    /**
     * Offline-First: Supports Delta Syncing.
     * Returns records modified after this timestamp.
     */
    @IsDateString()
    @IsOptional()
    readonly updatedSince?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;
}