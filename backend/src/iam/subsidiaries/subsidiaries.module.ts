// backend/src/subsidiaries/subsidiaries.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { IsExistingSubsidiaryConstraint } from './validators/is-existing-subsidiary.validator';
import { ClientsModule } from '../clients/clients.module';
import { ClientResolverModule } from '../client-resolver/client-resolver.module';
import { CountersModule } from '../../system/counters/counters.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    ClientResolverModule,
    CountersModule
  ],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService, IsExistingSubsidiaryConstraint],
  exports: [SubsidiariesService]
})
export class SubsidiariesModule { }