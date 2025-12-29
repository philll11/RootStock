import { PartialType } from '@nestjs/mapped-types';
import { CreateVarietyDto } from './create-variety.dto';
import { IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateVarietyDto extends PartialType(CreateVarietyDto) {
  @IsBoolean()
  @IsOptional()
  declare readonly isActive?: boolean;

  @IsNumber()
  @IsNotEmpty()
  readonly __v: number;
}
