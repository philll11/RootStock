// backend/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';

import { ClientsModule } from '../clients/clients.module';

import { IsClientIdsValidForUserTypeConstraint } from './validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingUserConstraint } from './validators/is-existing-user.validator';
import { IsExistingUsersConstraint } from './validators/is-existing-contact-users.validator';
import { CountersModule } from '../counters/counters.module';

@Module({
  imports: [
    forwardRef(() => RolesModule),
    forwardRef(() => ClientsModule),
    CountersModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    IsClientIdsValidForUserTypeConstraint,
    IsExistingUserConstraint,
    IsExistingUsersConstraint
  ],
  exports: [UsersService]
})
export class UsersModule { }