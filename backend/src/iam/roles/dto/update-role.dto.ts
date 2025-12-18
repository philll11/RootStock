import { IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
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