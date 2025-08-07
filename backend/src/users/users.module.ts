import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './entities/user.schema';
import { RolesModule } from 'src/roles/roles.module';
import { IsExistingRoleConstraint } from 'src/common/validators/is-existing-role.validator';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RolesModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    IsExistingRoleConstraint
  ],
})
export class UsersModule {}