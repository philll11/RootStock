// backend/src/master-data/varieties/varieties.module.ts
import { Module } from '@nestjs/common';
import { VarietiesService } from './varieties.service';
import { VarietiesController } from './varieties.controller';
import { IsExistingVarietyConstraint } from './validators/is-existing-variety.validator';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';

@Module({
  imports: [
    CountersModule,
    ClientResolverModule,
  ],
  controllers: [VarietiesController],
  providers: [VarietiesService, IsExistingVarietyConstraint],
  exports: [VarietiesService],
})
export class VarietiesModule {}