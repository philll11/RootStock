import { PartialType } from '@nestjs/mapped-types';
import { CreateVarietyDto } from './create-variety.dto';
import { IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateVarietyDto extends PartialType(CreateVarietyDto) {
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;

  @IsNumber()
  @IsOptional()
  readonly __v?: number;
}
