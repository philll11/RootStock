import { Module, forwardRef } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { AuditDiffService } from './audit-diff.service';
import { SystemConfigModule } from '../config/system-config.module';
import { ClientsModule } from '../../iam/clients/clients.module';
import { UsersModule } from '../../iam/users/users.module';
import { OrchardsModule } from '../../assets/orchards/orchards.module';
import { BlocksModule } from '../../assets/blocks/blocks.module';
import { AssessmentsModule } from '../../operations/assessments/assessments.module';
import { RolesModule } from '../../iam/roles/roles.module';

@Module({
  imports: [
    SystemConfigModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => OrchardsModule),
    forwardRef(() => BlocksModule),
    forwardRef(() => AssessmentsModule),
    forwardRef(() => RolesModule),
  ],
  controllers: [AuditsController],
  providers: [AuditsService, AuditDiffService],
  exports: [AuditsService],
})
export class AuditsModule {}
