// backend/src/assets/orchards/orchards.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { OrchardsController } from './orchards.controller';
import { IsExistingOrchardConstraint } from './validators/is-existing-orchard.validator';

import { ClientsModule } from '../../iam/clients/clients.module';
import { UsersModule } from '../../iam/users/users.module';
import { CountersModule } from '../../system/counters/counters.module';
import { BlocksModule } from '../blocks/blocks.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';
import { AuditsModule } from '../../system/audits/audits.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => BlocksModule),
    forwardRef(() => AuditsModule),
    CountersModule,
    ClientResolverModule,
  ],
  controllers: [OrchardsController],
  providers: [
    OrchardsService,
    IsExistingOrchardConstraint
  ],
  exports: [OrchardsService],
})
export class OrchardsModule {}