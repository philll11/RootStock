import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingClientConstraint } from '../validators/is-existing-client.validator';

export function IsExistingClient(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsExistingClientConstraint,
    });
  };
}