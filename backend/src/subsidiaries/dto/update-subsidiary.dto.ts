import { PartialType } from '@nestjs/swagger';
import { CreateSubsidiaryDto } from './create-subsidiary.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSubsidiaryDto extends PartialType(CreateSubsidiaryDto) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  declare readonly isActive?: boolean;
}