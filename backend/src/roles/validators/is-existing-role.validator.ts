import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { RolesService } from '../roles.service';

@ValidatorConstraint({ name: 'isExistingRole', async: true })
@Injectable()
export class IsExistingRoleConstraint implements ValidatorConstraintInterface {
  constructor(private readonly rolesService: RolesService) { }

  async validate(roleId: string, args: ValidationArguments) {
    if (!roleId) return true;
    return await this.rolesService.isRoleExistingAndActive(roleId);
  }

  defaultMessage(args: ValidationArguments) {
    return `Role with ID "${args.value}" does not exist or is not active.`;
  }
}