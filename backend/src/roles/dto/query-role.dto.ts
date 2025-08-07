import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryRoleDto {

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsBoolean()
    @IsOptional()
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    readonly includeInactives?: boolean;
}