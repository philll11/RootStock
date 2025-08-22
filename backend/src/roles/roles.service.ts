import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { Role, RoleDocument } from './schemas/role.schema';
import { RoleQueryBuilder } from './builders/roles-query.builder';
import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CountersService } from '../counters/counters.service';
import { handleConcurrentSoftDelete } from '../common/utils/concurrent-deletion.util';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private readonly clientResolverService: ClientResolverService,
    private readonly usersService: UsersService,
    private readonly countersService: CountersService,
  ) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('role', 'ROL');
    const paddedSequence = sequence_value.toString().padStart(4, '0');
    const recordId = `${prefix}${paddedSequence}`;

    const newRole = new this.roleModel({
      ...createRoleDto,
      recordId,
    });

    return newRole.save();
  }

  async findAll(query: QueryRoleDto, user: User): Promise<Role[]> {
    const queryBuilder = new RoleQueryBuilder(query, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    return await this.roleModel.find(filter).exec();
  }

  async findOne(roleId: string, user: User): Promise<Role> {
    const queryBuilder = new RoleQueryBuilder({}, user, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = {
      $and: [
        securityFilter,
        { _id: new Types.ObjectId(roleId) }
      ]
    };

    const role = await this.roleModel.findOne(finalFilter).exec();


    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found or you do not have permission to view it.`);
    }
    return role;
  }

  async update(roleId: string, updateRoleDto: UpdateRoleDto, user: User): Promise<Role> {
    await this.findOne(roleId, user); // Secure authorization check

    if (updateRoleDto.isActive === false) {
      const activeUserCount = await this.usersService.countActiveByRoleId(roleId);
      if (activeUserCount > 0) {
        throw new ConflictException(`This role cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign the users first.`);
      }
    }

    const updatedRole = await this.roleModel.findByIdAndUpdate(
      roleId,
      { $set: updateRoleDto },
      { new: true },
    ).exec();

    if (!updatedRole) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return updatedRole;
  }

  async remove(roleId: string, user: User): Promise<Role> {
    await this.findOne(roleId, user); // Secure authorization check

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // Handle concurrent soft deletion with transaction safety
      const deletedRole = await handleConcurrentSoftDelete<RoleDocument>(
        this.roleModel,
        roleId,
        session,
        'Role'
      );
      
      // Remove role reference from users
      await this.userModel.updateMany({ roleId: new Types.ObjectId(roleId) }, { $set: { roleId: null } }, { session }).exec();

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