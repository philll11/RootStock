// backend/src/operations/assessments/assessments.module.ts
import { Module, forwardRef } from '@nestjs/common';

import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentCalculatorService } from './calculations/assessment-calculator.service';

import { BlocksModule } from '../../assets/blocks/blocks.module';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';

@Module({
  imports: [
    forwardRef(() => BlocksModule),
    CountersModule,
    ClientResolverModule
  ],
  controllers: [AssessmentsController],
  providers: [
    AssessmentsService,
    AssessmentCalculatorService // Pure logic provider
  ],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}