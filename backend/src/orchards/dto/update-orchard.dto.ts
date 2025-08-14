import { IsBoolean, IsOptional, IsMongoId, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateOrchardDto } from './create-orchard.dto';
import { Type } from 'class-transformer';
import { IsExistingClient } from '../../clients/decorators/is-existing-client.decorator';
import { IsExistingContactUsers } from '../../users/decorators/is-existing-contact-users.decorator';

export class UpdateOrchardDto extends PartialType(CreateOrchardDto) {
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isActive?: boolean;

    // Re-declared to apply validation on optional field
    @IsMongoId()
    @IsExistingClient()
    @IsOptional()
    readonly clientId?: string;

    @IsArray()
    @IsMongoId({ each: true })
    @IsExistingContactUsers()
    @IsOptional()
    readonly userIds?: string[];
}