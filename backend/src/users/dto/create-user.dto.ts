import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserType } from '../entities/user.schema';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    readonly recordId: string;

    @IsString()
    @IsNotEmpty()
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    readonly lastName: string;

    @IsEnum(UserType)
    @IsNotEmpty()
    readonly userType: UserType;

    @IsMongoId()
    @IsOptional()
    readonly roleId?: string;

    @IsMongoId()
    @IsOptional()
    readonly clientId?: string;
}