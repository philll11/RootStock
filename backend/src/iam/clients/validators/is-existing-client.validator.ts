import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ClientsService } from '../clients.service';

@ValidatorConstraint({ name: 'isExistingClients', async: true })
@Injectable()
export class IsExistingClientConstraint implements ValidatorConstraintInterface {
  constructor(private readonly clientsService: ClientsService) {}

  async validate(clientIds: string[], args: ValidationArguments): Promise<boolean> {
    if (!clientIds || clientIds.length === 0) return true;
    return this.clientsService.validateClientIds(clientIds);
  }

  defaultMessage(args: ValidationArguments) {
    return `One or more client IDs in [${args.value}] do not exist, are inactive, or have been deleted.`;
  }
}