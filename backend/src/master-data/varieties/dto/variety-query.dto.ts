import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class VarietyQueryDto {
  @IsString()
  @IsOptional()
  readonly name?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  readonly isDeleted?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  readonly includeInactives?: boolean;
}
