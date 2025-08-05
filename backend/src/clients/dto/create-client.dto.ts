import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  readonly recordId: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsMongoId()
  @IsNotEmpty()
  readonly subsidiaryId: string; 
}