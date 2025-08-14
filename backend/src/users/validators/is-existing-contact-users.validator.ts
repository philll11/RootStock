import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { UsersService } from '../users.service';

@ValidatorConstraint({ name: 'isExistingContactUsers', async: true })
@Injectable()
export class IsExistingContactUsersConstraint implements ValidatorConstraintInterface {
    constructor(private readonly usersService: UsersService) { }

    async validate(userIds: string[], args: ValidationArguments): Promise<boolean> {
        if (!userIds || userIds.length === 0) return true;
        return this.usersService.validateContactUserIds(userIds);
    }

    defaultMessage(args: ValidationArguments) {
        return `One or more user IDs in [${args.value}] do not exist, are inactive, or are not 'contact' type users.`;
    }
}