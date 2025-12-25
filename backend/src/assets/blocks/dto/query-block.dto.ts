// backend/src/assets/blocks/dto/query-block.dto.ts
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBlockDto {

    @IsMongoId()
    @IsOptional()
    readonly orchardId?: string;

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsMongoId()
    @IsOptional()
    readonly varietyId?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;
}