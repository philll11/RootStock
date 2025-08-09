import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { IsExistingRoleConstraint } from "../roles/validators/is-existing-role.validator"

@Module({
  imports: [],
  controllers: [RolesController],
  providers: [RolesService, IsExistingRoleConstraint],
  exports: [RolesService]
})
export class RolesModule { }
