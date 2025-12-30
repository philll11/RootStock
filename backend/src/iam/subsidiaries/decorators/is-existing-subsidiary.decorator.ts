import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingSubsidiaryConstraint } from '../validators/is-existing-subsidiary.validator';

export function IsExistingSubsidiary(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsExistingSubsidiaryConstraint,
    });
  };
}