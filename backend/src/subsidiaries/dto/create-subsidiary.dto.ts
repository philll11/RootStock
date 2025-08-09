import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubsidiaryDto {
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}