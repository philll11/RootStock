// backend/src/users/validators/is-existing-contact-users.validator.ts
import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { UsersService } from '../users.service';

@ValidatorConstraint({ name: 'isExistingUsers', async: true })
@Injectable()
export class IsExistingUsersConstraint implements ValidatorConstraintInterface {
    constructor(private readonly usersService: UsersService) { }

    async validate(userIds: string[], args: ValidationArguments): Promise<boolean> {
        if (!userIds || userIds.length === 0) return true;
        return this.usersService.validateUserIds(userIds);
    }

    defaultMessage(args: ValidationArguments) {
        return `One or more user IDs in [${args.value}] do not exist, are inactive, or are not valid users.`;
    }
}