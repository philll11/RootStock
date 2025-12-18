import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { VarietiesService } from '../varieties.service';

@ValidatorConstraint({ name: 'isExistingVariety', async: true })
@Injectable()
export class IsExistingVarietyConstraint implements ValidatorConstraintInterface {
  constructor(private readonly varietiesService: VarietiesService) {}

  async validate(varietyId: string, args: ValidationArguments): Promise<boolean> {
    if (!varietyId) return true; // Allow empty if optional, handled by @IsNotEmpty if required
    return this.varietiesService.validateVarietyId(varietyId);
  }

  defaultMessage(args: ValidationArguments) {
    return `Variety with ID "${args.value}" does not exist, is inactive, or has been deleted.`;
  }
}
