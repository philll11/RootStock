import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingRoleConstraint } from '../validators/is-existing-role.validator';

/**
 * Custom decorator to validate if a role exists.
 * This decorator uses the IsExistingRoleConstraint class to perform the validation.
 *
 * @param validationOptions Optional validation options
 * @returns A function that registers the custom validator
 */
export function IsExistingRole(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsExistingRoleConstraint,
    });
  };
}