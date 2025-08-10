import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { Role, RoleDocument } from './entities/role.schema';
import { RoleQueryBuilder } from './builders/roles-query.builder';

import { User, UserDocument } from '../users/entities/user.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private readonly usersService: UsersService,
  ) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const createdRole = new this.roleModel(createRoleDto);
    return await createdRole.save();
  }

  async findAll(query: QueryRoleDto, loggedInUserRole: string): Promise<Role[]> {
    const queryBuilder = new RoleQueryBuilder(query, loggedInUserRole);
    const filter = queryBuilder.build();

    return await this.roleModel.find(filter).exec();
  }

  async findOne(roleId: string): Promise<Role> {
    const role = await this.roleModel.findOne({ _id: roleId, isDeleted: false, isActive: true }).exec();

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return role;
  }

  async update(roleId: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    // Apply "clean on, clean off" principle
    if (updateRoleDto.isActive === false) {
      const activeUserCount = await this.usersService.countActiveByRoleId(roleId);
      if (activeUserCount > 0) {
        throw new ConflictException(
          `This role cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign the users first.`,
        );
      }
    }

    const existingRole = await this.roleModel.findOneAndUpdate(
      { _id: roleId, isDeleted: false, isActive: true },
      { $set: updateRoleDto },
      { new: true },
    ).exec();

    if (!existingRole) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return existingRole;
  }


  async remove(roleId: string): Promise<Role> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Server Role->User references
      await this.userModel.updateMany(
        { roleId: roleId },
        { $set: { roleId: null } },
        { session },
      ).exec();

      // Soft-delete Role
      const deletedRole = await this.roleModel.findByIdAndUpdate(
        roleId,
        { isDeleted: true, isActive: false },
        { session, new: true },
      ).exec();

      // Throw error if Role doesn't exist
      if (!deletedRole) {
        await session.abortTransaction();
        throw new NotFoundException(`Role with ID "${roleId}" not found`);
      }

      await session.commitTransaction();
      return deletedRole;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }


  /**
 * Checks if a role exists, is active, and is not deleted.
 * This is used by custom validators to verify relationships.
 * @param roleId - The ID of the role to check.
 * @returns A boolean indicating if the role is valid.
 */
  async isRoleExistingAndActive(roleId: string): Promise<boolean> {
    const count = await this.roleModel.countDocuments({ _id: roleId, isDeleted: false, isActive: true }).exec();
    return count > 0;
  }
}
