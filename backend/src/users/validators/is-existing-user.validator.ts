import { Injectable } from '@nestjs/common';
import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { UsersService } from '../users.service';
@ValidatorConstraint({ name: 'isExistingUser', async: true })
@Injectable()
export class IsExistingUserConstraint implements ValidatorConstraintInterface {
    constructor(private readonly usersService: UsersService) { }
    async validate(userId: string, args: ValidationArguments): Promise<boolean> {
        if (!userId) return true;
        return this.usersService.isUserExistingAndActive(userId);
    }
    defaultMessage(args: ValidationArguments) {
        return `User with ID "${args.value}" does not exist, is inactive, or has been deleted.`
    }
}
