import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QuerySubsidiaryDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    recordId?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    includeInactives?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    isDeleted?: boolean;
}