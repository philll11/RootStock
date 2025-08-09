import { PartialType } from '@nestjs/mapped-types';
import { CreateSubsidiaryDto } from './create-subsidiary.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubsidiaryDto extends PartialType(CreateSubsidiaryDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}