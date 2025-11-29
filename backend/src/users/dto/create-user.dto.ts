// backend/src/users/dto/create-user.dto.ts
import { IsArray, Validate, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsExistingRole } from '../../roles/decorators/is-existing-role.decorator';
import { UserType } from '../schemas/user.schema';
import { IsClientIdsValidForUserTypeConstraint } from '../validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingClient } from "../../clients/decorators/is-existing-client.decorator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    readonly lastName: string;

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    readonly email: string;

    @IsString()
    @IsOptional()
    readonly password?: string;

    @IsEnum(UserType)
    @IsNotEmpty()
    readonly userType: UserType;

    @IsMongoId()
    @IsExistingRole()
    @IsOptional()
    readonly roleId?: string;

    @IsExistingClient()
    @Validate(IsClientIdsValidForUserTypeConstraint)
    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    readonly clientIds?: string[];
}