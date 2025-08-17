import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCounterDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) // Safe trim only for strings
  @IsNotEmpty()
  @MaxLength(10) // A sensible max length for a prefix
  prefix: string;
}