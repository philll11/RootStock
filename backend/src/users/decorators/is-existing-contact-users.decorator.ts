import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingContactUsersConstraint } from '../validators/is-existing-contact-users.validator';

export function IsExistingContactUsers(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsExistingContactUsersConstraint,
        });
    };
}