import { IsArray, Validate, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString,  } from 'class-validator';
import { IsExistingRole } from '../../roles/decorators/is-existing-role.decorator';
import { UserType } from '../schemas/user.schema';
import { IsClientIdsValidForUserTypeConstraint } from '../validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingClient } from "../../clients/decorators/is-existing-client.decorator";

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

    @IsExistingClient()
    @Validate(IsClientIdsValidForUserTypeConstraint)
    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    readonly clientIds?: string[];
}