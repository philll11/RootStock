import { IsNotEmpty, IsString, IsMongoId, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsExistingSubsidiary } from '../../subsidiaries/decorators/is-existing-subsidiary.decorator';

export class CreateClientDto {

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  readonly name: string;

  @IsMongoId()
  @IsExistingSubsidiary()
  @IsNotEmpty()
  @ValidateIf((o) => o.subsidiaryId !== null)
  readonly subsidiaryId: string;
}