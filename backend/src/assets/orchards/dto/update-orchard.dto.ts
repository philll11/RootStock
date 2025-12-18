import { IsBoolean, IsOptional, IsMongoId, IsArray, IsNumber, IsNotEmpty } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOrchardDto } from './create-orchard.dto';
import { Type } from 'class-transformer';
import { IsExistingUsers } from '../../../iam/users/decorators/is-existing-contact-users.decorator';

export class UpdateOrchardDto extends OmitType(PartialType(CreateOrchardDto), ['clientId'] as const) {
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    declare readonly isActive?: boolean;

    @IsArray()
    @IsMongoId({ each: true })
    @IsExistingUsers()
    @IsOptional()
    readonly userIds?: string[];

    /**
     * The document version for optimistic concurrency control.
     * Required to prevent overwriting updates from other users.
     */
    @IsNumber()
    @IsNotEmpty()
    readonly __v: number;
}