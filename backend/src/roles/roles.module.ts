import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { IsExistingRoleConstraint } from "./validators/is-existing-role.validator";
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [RolesController],
  providers: [RolesService, IsExistingRoleConstraint],
  exports: [RolesService],
})
export class RolesModule {}