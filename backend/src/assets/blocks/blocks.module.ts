// backend/src/assets/blocks/blocks.module.ts
import { Module, forwardRef } from '@nestjs/common';

import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';

import { OrchardsModule } from '../orchards/orchards.module';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';
import { VarietiesModule } from '../../master-data/varieties/varieties.module';
import { AssessmentsModule } from '../../operations/assessments/assessments.module';

@Module({
  imports: [
    forwardRef(() => OrchardsModule),
    forwardRef(() => VarietiesModule),
    forwardRef(() => AssessmentsModule),
    CountersModule,
    ClientResolverModule,
  ],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}