import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument, UserType } from './schemas/user.schema';
import { UserQueryBuilder } from './builders/user-query.builder';
import { VisibilityScope } from '../roles/schemas/role.schema';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { PERMISSIONS } from '../common/constants/permissions.constants';
import { CountersService } from '../counters/counters.service';
import { VisibilityService } from '../common/visibility/visibility.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly clientResolverService: ClientResolverService,
    private readonly countersService: CountersService,
    private readonly visibilityService: VisibilityService,
  ) { }

  /**
   * Creates a new user based on the provided DTO.
   * Converts string IDs to ObjectId types for role and client associations.
   * Validates that the requesting user has access to assign the specified clients.
   * @param createUserDto - The DTO containing user creation data.
   * @param requestingUser - The authenticated user making the request.
   * @returns The created user document.
   */
  async create(createUserDto: CreateUserDto, requestingUser: User): Promise<User> {
    const userRole = requestingUser.roleId as any; // Role is populated from JWT

    // Validate visibility scope for client assignments
    if (createUserDto.clientIds && createUserDto.clientIds.length > 0) {
      await this.visibilityService.validateClientAccess(createUserDto.clientIds, requestingUser);
    } else {
      // Business Rule: Only Global users can create unassigned users.
      if (userRole.visibilityScope !== VisibilityScope.GLOBAL) {
        throw new ForbiddenException('You do not have permission to create unassigned users. You must assign the new user to at least one client.');
      }
    }
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('user', 'USR');
    const paddedSequence = sequence_value.toString().padStart(4, '0');
    const recordId = `${prefix}${paddedSequence}`;

    const { roleId, clientIds, ...restOfDto } = createUserDto;
    const payload: Partial<User> = { ...restOfDto };

    payload.name = `${createUserDto.firstName} ${createUserDto.lastName}`;

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }

    const userToCreate = new this.userModel({
      ...payload,
      recordId,
    });

    return userToCreate.save();
  }

  async findAll(query: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(query, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.userModel.find(filter).exec();
  }

  async findAllByClientId(clientId: string, queryDto: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter.clientIds = new Types.ObjectId(clientId);
    return this.userModel.find(filter).exec();
  }

  async findAllByRoleId(roleId: string, queryDto: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter.roleId = new Types.ObjectId(roleId);
    return this.userModel.find(filter).exec();
  }

  /**
   * Finds a single user by their ID, ensuring the requesting user has permission to view them.
   * @param userId - The ID of the user to find.
   * @param user - The authenticated user making the request.
   * @returns The found user document.
   */
  async findOne(userId: string, user: User, options: { includeInactive?: boolean } = {}): Promise<User> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new UserQueryBuilder(queryDto, user, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = {
      $and: [
        securityFilter,
        { _id: new Types.ObjectId(userId) }
      ]
    };

    const targetUser = await this.userModel.findOne(finalFilter).exec();
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found or you do not have permission to view it.`);
    }
    return targetUser;
  }

  /**
   * Updates a user, ensuring the requesting user has permission to modify them.
   * Enforces business rules for Contact users (limited to basic personal info).
   * @param userId - The ID of the user to update.
   * @param updateUserDto - The DTO containing update data.
   * @param user - The authenticated user making the request.
   * @returns The updated user document.
   */
  async update(userId: string, updateUserDto: UpdateUserDto, user: User): Promise<User> {
    const existingUser = await this.findOne(userId, user, { includeInactive: true }); // Secure findOne doubles as authorization check

    // Business Rule: Contact users can only update their own information
    if (user.userType === UserType.CONTACT) {
      // Contact users can only update themselves
      if ((existingUser as any)._id.toString() !== (user as any)._id.toString()) {
        throw new ForbiddenException('Contact users can only update their basic account information.');
      }

      // Business Rule: Contact users can only update basic personal fields
      const allowedContactFields = ['firstName', 'lastName', 'email'];
      // Only check fields that actually have values (not undefined)
      const attemptedFields = Object.keys(updateUserDto).filter(key => updateUserDto[key] !== undefined);
      const unauthorizedFields = attemptedFields.filter(field => !allowedContactFields.includes(field));

      if (unauthorizedFields.length > 0) {
        throw new ForbiddenException(
          `Contact users can only update basic personal information. Unauthorized fields: ${unauthorizedFields.join(', ')}`
        );
      }
    }

    // Contact user Visibility Scope (VS) has already been validated in previous steps - no duplicate VS check needed
    if (user.userType !== UserType.CONTACT) {
      // Validate visibility scope for client assignments in updates
      if (updateUserDto.clientIds && updateUserDto.clientIds.length > 0) {
        await this.visibilityService.validateClientAccess(updateUserDto.clientIds, user);
      }
    }

    const updatePayload = this._prepareUpdatePayload(updateUserDto, existingUser, user);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true }
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${userId}" could not be updated.`);
    }
    return updatedUser;
  }

  /**
   * Deletes a user, ensuring the requesting user has permission to do so.
   * Enforces business rule: Contact users cannot delete other users.
   * @param userId - The ID of the user to delete.
   * @param user - The authenticated user making the request.
   * @returns The soft-deleted user document.
   */
  async remove(userId: string, user: User): Promise<User> {
    const targetUser = await this.userModel.findById(userId).select('clientIds').lean().exec();
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found or you do not have permission to view it.`);
    }

    // Validate visibility scope for client assignments in updates
    const targetClientIds = (targetUser.clientIds || []).map((id) => id.toString());
    await this.visibilityService.validateClientAccess(targetClientIds, user);

    const deletedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { isDeleted: true, isActive: false },
      { new: true },
    ).exec();

    if (!deletedUser) {
      // This is a safeguard against a race condition where the user is deleted between our check and this update.
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    return deletedUser;
  }

  /**
 * Counts active, non-deleted users associated with a specific client.
 * Used as a pre-condition check before deactivating a client.
 * @param clientId The ID of the parent client.
 * @returns The number of active users assigned to the client.
 */
  async countActiveByClientId(clientId: string): Promise<number> {
    return this.userModel.countDocuments({
      clientIds: clientId,
      isActive: true,
      isDeleted: false,
    }).exec();
  }

  /**
 * Counts active, non-deleted users associated with a specific role.
 * Used as a pre-condition check before deactivating a role.
 * @param roleId The ID of the parent role.
 * @returns The number of active users assigned to the role.
 */
  async countActiveByRoleId(roleId: string): Promise<number> {
    return this.userModel.countDocuments({
      roleId: roleId,
      isActive: true,
      isDeleted: false,
    }).exec();
  }

  /**
* Validates that a user ID exists, is active, and not deleted.
* @param userId - The user ID to validate.
* @returns `true` if the ID is valid, `false` otherwise.
*/
  async validateUserId(userId: string): Promise<boolean> {
    if (!userId) return false;
    const existingUser = await this.userModel.exists({
      _id: userId,
      isActive: true,
      isDeleted: false,
    }).exec();
    return !!existingUser;
  }

  /**
 * Validates that all user IDs in an array exist, are active, not deleted,
 * and are of the 'contact' UserType.
 * @param userIds - An array of user IDs to validate.
 * @returns `true` if all IDs are valid contact users, `false` otherwise.
 */
  async validateContactUserIds(userIds: string[]): Promise<boolean> {
    if (!userIds || userIds.length === 0) {
      return true;
    }
    const activeContactUsersCount = await this.userModel.countDocuments({
      _id: { $in: userIds.map(id => new Types.ObjectId(id)) },
      userType: UserType.CONTACT,
      isActive: true,
      isDeleted: false,
    });
    return activeContactUsersCount === userIds.length;
  }

  /**
 * Finds a single user by their unique recordId and populates their role.
 * This is specifically used for authentication lookups.
 * @param recordId The user's unique recordId (from JWT `sub` claim)
 * @returns A user document with the role populated, or null if not found.
 */
  async findOneByRecordIdAndPopulateRole(recordId: string): Promise<User | null> {
    return this.userModel
      .findOne({ recordId })
      .populate({
        path: 'roleId',
        model: 'Role',
      })
      .exec();
  }

  /**
 * Prepares the payload for an EXISTING user update.
 * Handles partial updates, derived fields, and authorization for sensitive fields.
 * @private
 */
  private _prepareUpdatePayload(dto: UpdateUserDto, existingUser: User, loggedInUser: User): Partial<User> {
    const { roleId, clientIds, isActive, ...restOfDto } = dto;
    const payload: Partial<User> = { ...restOfDto };

    const loggedInUserPermissions = (loggedInUser.roleId as any)?.permissions || [];

    if (payload.firstName || payload.lastName) {
      const newFirstName = payload.firstName || existingUser.firstName;
      const newLastName = payload.lastName || existingUser.lastName;
      payload.name = `${newFirstName} ${newLastName}`;
    }

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }

    
    // System Constraint: Only roles with CLIENT_MANAGE_INACTIVE permissions can change Client status.
    // This prevents non-admin users from turning off key master data records
    if (dto.isActive !== undefined) {
      if (!loggedInUserPermissions.includes(PERMISSIONS.USER_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      payload.isActive = isActive;
    }
    return payload;
  }
}