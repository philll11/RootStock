import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '../schemas/user.schema';

export class QueryUserDto {

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsEnum(UserType)
    @IsOptional()
    readonly userType?: UserType;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;
}