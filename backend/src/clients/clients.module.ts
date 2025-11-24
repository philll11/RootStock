import { Module, forwardRef } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientResolverService } from './client-resolver/client-resolver.service';

import { IsExistingClientConstraint } from "./validators/is-existing-client.validator";
import { IsExistingSingleClientConstraint } from './validators/is-existing-single-client.validator';

import { SubsidiariesModule } from '../subsidiaries/subsidiaries.module';
import { UsersModule } from '../users/users.module';
import { OrchardsModule } from '../orchards/orchards.module';
import { CountersModule } from '../counters/counters.module';

@Module({
  imports: [
    forwardRef(() => SubsidiariesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => OrchardsModule),
    CountersModule,
  ],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    ClientResolverService,
    IsExistingClientConstraint,
    IsExistingSingleClientConstraint
  ],
  exports: [ClientsService, ClientResolverService],
})
export class ClientsModule {}