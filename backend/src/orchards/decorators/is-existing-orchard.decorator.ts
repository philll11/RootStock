import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingOrchardConstraint } from '../validators/is-existing-orchard.validator';

/**
 * @decorator
 * @description A custom validation decorator that checks if an orchard with the given ID
 * exists, is active, and is not deleted in the database.
 * @param validationOptions - Standard class-validator options.
 */
export function IsExistingOrchard(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isExistingOrchard',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsExistingOrchardConstraint,
    });
  };
}