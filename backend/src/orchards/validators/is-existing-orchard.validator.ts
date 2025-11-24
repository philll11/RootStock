import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { OrchardsService } from '../orchards.service';

@ValidatorConstraint({ name: 'isExistingOrchard', async: true })
@Injectable()
export class IsExistingOrchardConstraint implements ValidatorConstraintInterface {
  constructor(private readonly orchardsService: OrchardsService) {}

  /**
   * Validates that all orchard IDs in an array exist, are active, and not deleted.
   * @param orchardIds - An array of orchard IDs to validate.
   * @returns `true` if all IDs are valid, `false` otherwise.
   */
  async validate(orchardIds: string[], args: ValidationArguments): Promise<boolean> {
    if (!orchardIds || orchardIds.length === 0) return true;
    return this.orchardsService.validateOrchardIds(orchardIds);
  }

  defaultMessage(args: ValidationArguments) {
    return `One or more orchard IDs in [${args.value}] do not exist, are inactive, or have been deleted.`;
  }
}