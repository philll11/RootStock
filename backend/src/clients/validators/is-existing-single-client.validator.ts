import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ClientsService } from '../clients.service';

@ValidatorConstraint({ name: 'isExistingSingleClient', async: true })
@Injectable()
export class IsExistingSingleClientConstraint implements ValidatorConstraintInterface {
  constructor(private readonly clientsService: ClientsService) {}

  async validate(clientId: string, args: ValidationArguments): Promise<boolean> {
    if (!clientId) return false;
    return this.clientsService.validateSingleClientId(clientId);
  }

  defaultMessage(args: ValidationArguments) {
    return `Client with ID "${args.value}" does not exist, is inactive, or has been deleted.`;
  }
}