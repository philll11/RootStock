import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingSingleClientConstraint } from '../validators/is-existing-single-client.validator';

export function IsExistingSingleClient(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isExistingSingleClient',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsExistingSingleClientConstraint,
    });
  };
}