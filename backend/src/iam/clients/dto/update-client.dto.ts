import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClientDto extends OmitType(PartialType(CreateClientDto), ['subsidiaryId'] as const) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  declare readonly isActive?: boolean;
}