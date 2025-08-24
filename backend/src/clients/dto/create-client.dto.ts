import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsExistingSubsidiary } from '../../subsidiaries/decorators/is-existing-subsidiary.decorator';

export class CreateClientDto {

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  readonly name: string;

  @IsOptional()
  @IsMongoId()
  @IsExistingSubsidiary()
  readonly subsidiaryId?: string;
}