import { IsString, IsNotEmpty, IsMongoId, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { IsExistingSingleClient } from '../../../iam/clients/decorators/is-existing-single-client.decorator';
import { IsExistingUsers } from '../../../iam/users/decorators/is-existing-contact-users.decorator';

class CreateAddressDto {
    @IsString()
    @IsOptional()
    readonly street?: string;

    @IsString()
    @IsOptional()
    readonly city?: string;

    @IsString()
    @IsOptional()
    readonly state?: string;

    @IsString()
    @IsOptional()
    readonly postalCode?: string;

    @IsString()
    @IsOptional()
    readonly country?: string;
}

export class CreateOrchardDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsMongoId()
    @IsExistingSingleClient() // Ensures the client exists and is active
    @IsNotEmpty()
    readonly clientId: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressDto)
    readonly address?: CreateAddressDto;

    @IsArray()
    @IsMongoId({ each: true })
    @IsExistingUsers() // Ensures all users exist and are active
    @IsOptional()
    readonly userIds?: string[];
}