import { Module, forwardRef } from '@nestjs/common';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { IsExistingSubsidiaryConstraint } from './validators/is-existing-subsidiary.validator';
import { ClientsModule } from '../clients/clients.module';
import { ClientResolverModule } from '../clients/client-resolver/client-resolver.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    ClientResolverModule
  ],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService, IsExistingSubsidiaryConstraint],
  exports: [SubsidiariesService]
})
export class SubsidiariesModule { }