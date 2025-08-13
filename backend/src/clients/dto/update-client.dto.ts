import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsBoolean, IsOptional, IsMongoId, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { IsExistingSubsidiary } from '../../subsidiaries/decorators/is-existing-subsidiary.decorator';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isActive?: boolean;

    @IsMongoId()
    @IsExistingSubsidiary()
    @IsOptional()
    @ValidateIf((o) => o.subsidiaryId !== null)
    subsidiaryId?: string;
}