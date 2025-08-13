import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  readonly isActive?: boolean;
}