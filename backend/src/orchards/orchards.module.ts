import { Module, forwardRef } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { OrchardsController } from './orchards.controller';
import { ClientResolverModule } from '../clients/client-resolver/client-resolver.module';
import { IsExistingOrchardConstraint } from './validators/is-existing-orchard.validator';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { CountersModule } from '../counters/counters.module'; 
import { VisibilityModule } from '../common/visibility/visibility.module';

@Module({
  imports: [
    ClientResolverModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => UsersModule),
    CountersModule,
    VisibilityModule
  ],
  controllers: [OrchardsController],
  providers: [
    OrchardsService,
    IsExistingOrchardConstraint
  ],
  exports: [OrchardsService],
})
export class OrchardsModule {}