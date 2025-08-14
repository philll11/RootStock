import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingUserConstraint } from '../validators/is-existing-user.validator';

export function IsExistingUser(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsExistingUserConstraint,
    });
  };
}