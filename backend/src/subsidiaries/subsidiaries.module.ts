import { Module } from '@nestjs/common';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { IsExistingSubsidiaryConstraint } from './validators/is-existing-subsidiary.validator';

@Module({
  imports: [],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService, IsExistingSubsidiaryConstraint],
  exports: [SubsidiariesService]
})
export class SubsidiariesModule { }