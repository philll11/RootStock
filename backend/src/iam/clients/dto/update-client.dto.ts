// backend/src/iam/clients/dto/update-client.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClientDto extends OmitType(PartialType(CreateClientDto), ['subsidiaryId'] as const) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  declare readonly isActive?: boolean;

  @IsNumber()
  @IsNotEmpty()
  readonly __v: number;
}