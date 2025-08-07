import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsExistingRole } from '../../common/decorators/is-existing-role.decorator';
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
    @IsExistingRole()
    @IsOptional()
    readonly roleId?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    readonly clientIds?: string[];
}