import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { IsClientIdsValidForUserTypeConstraint } from './validators/is-client-ids-valid-for-user-type.validator';
import { IsExistingRoleConstraint } from "../common/validators/is-existing-role.validator"
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RolesModule
  ],
  controllers: [UsersController],
  providers: [UsersService, IsExistingRoleConstraint, IsClientIdsValidForUserTypeConstraint],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}