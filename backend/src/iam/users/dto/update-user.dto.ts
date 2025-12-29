// backend/src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
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