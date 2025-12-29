// backend/src/assets/blocks/dto/update-block.dto.ts
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBlockDto } from './create-block.dto';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBlockDto extends OmitType(PartialType(CreateBlockDto), ['orchardId'] as const) {
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    declare readonly isActive?: boolean;

    /**
     * The document version for optimistic concurrency control.
     * Required to prevent overwriting updates from other users.
     */
    @IsNumber()
    @IsNotEmpty()
    readonly __v: number;
}