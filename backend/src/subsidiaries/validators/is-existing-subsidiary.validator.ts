import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, } from 'class-validator';
import { SubsidiariesService } from '../subsidiaries.service';

@ValidatorConstraint({ name: 'isExistingSubsidiary', async: true })
@Injectable()
export class IsExistingSubsidiaryConstraint implements ValidatorConstraintInterface {
    constructor(private readonly subsidiariesService: SubsidiariesService) { }

    async validate(subsidiaryId: string, args: ValidationArguments): Promise<boolean> {
        if (!subsidiaryId) return true;
        return this.subsidiariesService.isExistingAndActive(subsidiaryId);
    }

    defaultMessage(args: ValidationArguments) {
        return `Subsidiary with ID "${args.value}" does not exist, is inactive, or has been deleted.`;
    }
}