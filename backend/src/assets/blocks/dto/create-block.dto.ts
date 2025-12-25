// backend/src/assets/blocks/schemas/block.schema.ts
import { IsArray, IsMongoId, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsExistingVariety } from '../../../master-data/varieties/decorators/is-existing-variety.decorator';
import { IsExistingOrchard } from '../../orchards/decorators/is-existing-orchard.decorator';

class PlantingDto {
  @IsMongoId()
  @IsNotEmpty()
  @IsExistingVariety()
  readonly varietyId: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  readonly treeCount: number;
}

export class CreateBlockDto {

  @IsMongoId()
  @IsNotEmpty()
  @IsExistingOrchard()
  readonly orchardId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  readonly name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantingDto)
  readonly plantings: PlantingDto[];
}