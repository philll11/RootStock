import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';
import { IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  readonly isActive?: boolean;

  /**
   * The document version for optimistic concurrency control.
   * This is required for all update operations.
   */
  @IsNumber()
  readonly __v: number;
}