import { Module, forwardRef } from '@nestjs/common';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { IsExistingSubsidiaryConstraint } from './validators/is-existing-subsidiary.validator';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [forwardRef(() => ClientsModule)],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService, IsExistingSubsidiaryConstraint],
  exports: [SubsidiariesService]
})
export class SubsidiariesModule { }