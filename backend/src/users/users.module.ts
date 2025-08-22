import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';

import { ClientsModule } from '../clients/clients.module';
import { ClientResolverModule } from '../clients/client-resolver/client-resolver.module';

import { IsClientIdsValidForUserTypeConstraint } from './validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingClientConstraint } from "../clients/validators/is-existing-client.validator";
import { IsExistingUserConstraint } from './validators/is-existing-user.validator';
import { IsExistingContactUsersConstraint } from './validators/is-existing-contact-users.validator';
import { CountersModule } from '../counters/counters.module';

import { VisibilityModule } from '../common/visibility/visibility.module';

@Module({
  imports: [
    forwardRef(() => RolesModule),
    forwardRef(() => ClientsModule),
    ClientResolverModule,
    CountersModule,
    VisibilityModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    IsClientIdsValidForUserTypeConstraint,
    IsExistingClientConstraint,
    IsExistingUserConstraint,
    IsExistingContactUsersConstraint
  ],
  exports: [UsersService]
})
export class UsersModule { }