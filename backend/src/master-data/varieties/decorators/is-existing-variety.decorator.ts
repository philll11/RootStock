import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingVarietyConstraint } from '../validators/is-existing-variety.validator';

/**
 * @decorator
 * @description A custom validation decorator that checks if a variety with the given ID
 * exists, is active, and is not deleted in the database.
 * @param validationOptions - Standard class-validator options.
 */
export function IsExistingVariety(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isExistingVariety',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsExistingVarietyConstraint,
    });
  };
}
