// backend/src/orchards/orchards.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { OrchardsController } from './orchards.controller';

import { IsExistingOrchardConstraint } from './validators/is-existing-orchard.validator';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { CountersModule } from '../counters/counters.module';

@Module({
  imports: [
    forwardRef(() => ClientsModule),
    forwardRef(() => UsersModule),
    CountersModule
  ],
  controllers: [OrchardsController],
  providers: [
    OrchardsService,
    IsExistingOrchardConstraint
  ],
  exports: [OrchardsService],
})
export class OrchardsModule {}