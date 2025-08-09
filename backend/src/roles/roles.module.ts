import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './entities/role.schema';
import { IsExistingRoleConstraint } from "../roles/validators/is-existing-role.validator"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema}])
  ],
  controllers: [RolesController],
  providers: [RolesService, IsExistingRoleConstraint],
  exports:[RolesService]
})
export class RolesModule {}
