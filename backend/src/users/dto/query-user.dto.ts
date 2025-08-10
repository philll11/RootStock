import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserType } from '../schemas/user.schema';

const toBoolean = (value: string) => value === 'true';

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

    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    @IsOptional()
    readonly isDeleted?: boolean;

    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    @IsOptional()
    readonly includeInactives?: boolean;
}