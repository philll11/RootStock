import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubsidiaryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}