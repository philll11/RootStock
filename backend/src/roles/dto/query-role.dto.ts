import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRoleDto {

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;
}