import { Module, forwardRef } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { SubsidiariesModule } from '../subsidiaries/subsidiaries.module';
import { IsExistingClientConstraint } from "./validators/is-existing-client.validator";
import { IsExistingSingleClientConstraint } from './validators/is-existing-single-client.validator';
import { ClientResolverModule } from './client-resolver/client-resolver.module';
import { UsersModule } from '../users/users.module';
import { OrchardsModule } from '../orchards/orchards.module';
import { CountersModule } from '../counters/counters.module';

@Module({
  imports: [
    forwardRef(() => SubsidiariesModule),
    forwardRef(() => UsersModule),
    ClientResolverModule,
    forwardRef(() => OrchardsModule),
    CountersModule,
  ],
  controllers: [ClientsController],
  providers: [
    ClientsService, 
    IsExistingClientConstraint,
    IsExistingSingleClientConstraint
  ],
  exports: [ClientsService],
})
export class ClientsModule {}