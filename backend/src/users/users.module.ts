import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';
import { ClientsModule } from '../clients/clients.module';
import { IsClientIdsValidForUserTypeConstraint } from './validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingClientsConstraint } from "../clients/validators/is-existing-clients.validator";
import { IsExistingUserConstraint } from './validators/is-existing-user.validator';

@Module({
  imports: [RolesModule, forwardRef(() => ClientsModule)],
  controllers: [UsersController],
  providers: [
    UsersService, 
    IsClientIdsValidForUserTypeConstraint, 
    IsExistingClientsConstraint,
    IsExistingUserConstraint,
  ],
  exports: [UsersService]
})
export class UsersModule {}