// src/roles/dto/create-role.dto.ts
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VisibilityScope } from '../entities/role.schema';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  readonly recordId: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsEnum(VisibilityScope)
  @IsNotEmpty()
  readonly visibilityScope: VisibilityScope;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly permissions?: string[];
}