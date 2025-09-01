import { IsBoolean, IsOptional, IsMongoId, IsArray } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOrchardDto } from './create-orchard.dto';
import { Type } from 'class-transformer';
import { IsExistingUsers } from '../../users/decorators/is-existing-contact-users.decorator';

export class UpdateOrchardDto extends OmitType(PartialType(CreateOrchardDto), ['clientId'] as const) {
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isActive?: boolean;

    @IsArray()
    @IsMongoId({ each: true })
    @IsExistingUsers()
    @IsOptional()
    readonly userIds?: string[];
}