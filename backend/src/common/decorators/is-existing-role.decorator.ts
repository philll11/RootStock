import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingRoleConstraint } from '../validators/is-existing-role.validator';

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