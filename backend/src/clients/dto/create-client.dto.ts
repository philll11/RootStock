import { IsNotEmpty, IsString, IsMongoId, ValidateIf } from 'class-validator';
import { IsExistingSubsidiary } from '../../subsidiaries/decorators/is-existing-subsidiary.decorator';

export class CreateClientDto {

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsMongoId()
  @IsExistingSubsidiary()
  @IsNotEmpty()
  @ValidateIf((o) => o.subsidiaryId !== null)
  readonly subsidiaryId: string;
}