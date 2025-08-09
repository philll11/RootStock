import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserType } from '../entities/user.schema';

@ValidatorConstraint({ name: 'isClientIdsValidForUserType', async: false })
@Injectable()
export class IsClientIdsValidForUserTypeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const dto = args.object as CreateUserDto;

    // Rule: If userType is 'contact', clientIds must be an array with exactly one element.
    if (dto.userType === UserType.CONTACT) {
      return Array.isArray(dto.clientIds) && dto.clientIds.length === 1;
    }

    // For any other userType (e.g., 'employee'), this validation does not impose a rule.
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as CreateUserDto;
    if (dto.userType === UserType.CONTACT) {
      return 'Users with type "contact" must be assigned to exactly one client.';
    }
    return 'Invalid client ID assignment for the specified user type.';
  }
}