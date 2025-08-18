import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { IsExistingRoleConstraint } from "./validators/is-existing-role.validator";
import { UsersModule } from '../users/users.module';
import { CountersModule } from '../counters/counters.module';
import { ClientResolverModule } from '../clients/client-resolver/client-resolver.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    CountersModule,
    ClientResolverModule,
  ],
  controllers: [RolesController],
  providers: [RolesService, IsExistingRoleConstraint],
  exports: [RolesService],
})
export class RolesModule {}