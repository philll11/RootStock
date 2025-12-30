import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVarietyDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;
}
