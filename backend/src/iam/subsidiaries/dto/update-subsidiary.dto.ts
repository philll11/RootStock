import { PartialType } from '@nestjs/swagger';
import { CreateSubsidiaryDto } from './create-subsidiary.dto';
import { IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSubsidiaryDto extends PartialType(CreateSubsidiaryDto) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  declare readonly isActive?: boolean;

  /**
   * The document version for optimistic concurrency control.
   * This is required for all update operations.
   */
  @IsNumber()
  @IsNotEmpty()
  readonly __v: number;
}