import { IsString, IsNotEmpty, IsMongoId, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { IsExistingSingleClient } from '../../clients/decorators/is-existing-single-client.decorator';
import { IsExistingContactUsers } from '../../users/decorators/is-existing-contact-users.decorator';

class CreateAddressDto {
    @IsString()
    @IsOptional()
    street?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    country?: string;
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
    @IsExistingContactUsers() // Ensures all users exist and are active
    @IsOptional()
    readonly userIds?: string[];
}