// backend/src/master-data/varieties/varieties.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { VarietiesService } from './varieties.service';
import { VarietiesController } from './varieties.controller';
import { IsExistingVarietyConstraint } from './validators/is-existing-variety.validator';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';
import { BlocksModule } from '../../assets/blocks/blocks.module';

@Module({
  imports: [
    forwardRef(() => BlocksModule),
    CountersModule,
    ClientResolverModule,
  ],
  controllers: [VarietiesController],
  providers: [VarietiesService, IsExistingVarietyConstraint],
  exports: [VarietiesService],
})
export class VarietiesModule {}