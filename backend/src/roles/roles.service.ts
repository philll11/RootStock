// backend/src/roles/roles.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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
import { PERMISSIONS } from '../common/constants/permissions.constants';

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

  async create(createRoleDto: CreateRoleDto, requestingUser: UserDocument): Promise<Role> {
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('role', 'ROL');
    const paddedSequence = sequence_value.toString().padStart(4, '0');
    const recordId = `${prefix}${paddedSequence}`;

    const newRole = new this.roleModel({
      ...createRoleDto,
      recordId
    });

    return newRole.save();
  }

  async findAll(query: QueryRoleDto, requestingUser: User): Promise<Role[]> {
    const queryBuilder = new RoleQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return await this.roleModel.find(filter).exec();
  }

  async findOne(roleId: string, requestingUser: User, options: { includeInactive?: boolean } = {}): Promise<Role> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new RoleQueryBuilder(queryDto, requestingUser, this.clientResolverService);
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

  async update(roleId: string, updateRoleDto: UpdateRoleDto, requestingUser: User): Promise<Role> {
    // Layer 2 check to ensure requestingUser has permission to see the role they are trying to update.
    const existingRole = await this.findOne(roleId, requestingUser, { includeInactive: true });

    // Prevent deactivation of Roles that are assigned to users
    if (updateRoleDto.isActive === false) {
      const activeUserCount = await this.usersService.countActiveByRoleId(roleId);
      if (activeUserCount > 0) {
        throw new ConflictException(`This role cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign the users first.`);
      }
    }

    const { __v, ...restOfDto } = updateRoleDto;
    const updatePayload: Partial<Role> = { ...restOfDto };

    // System Constraint: Only roles with ROLE_MANAGE_INACTIVE permissions can change Role status.
    if (updateRoleDto.isActive !== undefined) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.ROLE_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status of a role.');
      }
      updatePayload.isActive = updateRoleDto.isActive;
    }

    // Atomically find the document by its ID and the version from the DTO, and update it.
    // If the document has been updated since it was fetched, its version will have changed,
    // and the find query will not find a match, resulting in a null return.
    const updatedRole = await this.roleModel.findOneAndUpdate(
      { _id: roleId, __v: updateRoleDto.__v },
      { $set: updatePayload, $inc: { __v: 1 } },
      { new: true }
    ).exec();

    if (!updatedRole) {
      throw new ConflictException('Update failed due to a version conflict. The record has been modified by another user. Please reload and try again.');
    }

    return updatedRole;
  }

  async remove(roleId: string, requestingUser: User): Promise<Role> {
    await this.findOne(roleId, requestingUser); // Secure authorization check

    const activeUserCount = await this.userModel.countDocuments({ roleId: new Types.ObjectId(roleId), isDeleted: false });
    if (activeUserCount > 0) {
      throw new ConflictException('Cannot delete role as it is currently assigned to one or more users.');
    }

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