// backend/src/clients/dto/query-client.dto.ts

import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryClientDto {

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsMongoId()
    @IsOptional()
    readonly subsidiaryId?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;
}