// backend/src/operations/assessments/assessments.module.ts
import { Module, forwardRef } from '@nestjs/common';

import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentCalculatorService } from './calculations/assessment-calculator.service';
import { Assessment, AssessmentSchema } from './schemas/assessment.schema';

import { BlocksModule } from '../../assets/blocks/blocks.module';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';
import { AuditsModule } from '../../system/audits/audits.module';

@Module({
  imports: [
    forwardRef(() => AuditsModule),
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