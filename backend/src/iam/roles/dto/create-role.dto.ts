import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { VisibilityScope } from '../schemas/role.schema';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  readonly name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  readonly description?: string;

  @IsEnum(VisibilityScope)
  @IsNotEmpty()
  readonly visibilityScope: VisibilityScope;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly permissions?: string[];
}