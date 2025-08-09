import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingClientsConstraint } from '../validators/is-existing-clients.validator';

export function IsExistingClients(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsExistingClientsConstraint,
    });
  };
}