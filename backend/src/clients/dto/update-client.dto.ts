// src/clients/dto/update-client.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;
}