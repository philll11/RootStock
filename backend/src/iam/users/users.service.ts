// backend/src/users/users.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { handleConcurrentSoftDelete } from '../../common/utils/concurrent-deletion.util';

import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument, UserType } from './schemas/user.schema';
import { UserQueryBuilder } from './builders/user-query.builder';

import { Client } from '../clients/schemas/client.schema';
import { ClientResolverService } from '../client-resolver/client-resolver.service';

import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { CountersService } from '../../system/counters/counters.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectConnection() private connection: Connection,
    private readonly clientResolverService: ClientResolverService,
    private readonly countersService: CountersService,
  ) { }

  /**
   * Creates a new user based on the provided DTO.
   * Converts string IDs to ObjectId types for role and client associations.
   * Validates that the requesting user has access to assign the specified clients.
   * @param createUserDto - The DTO containing user creation data.
   * @param requestingUser - The authenticated user making the request.
   * @returns The created user document.
   */
  async create(createUserDto: CreateUserDto, requestingUser: UserDocument): Promise<UserDocument> {
    // === LAYER 3: BUSINESS RULE VALIDATION ===
    if (createUserDto.userType === UserType.CONTACT && (!createUserDto.clientIds || createUserDto.clientIds.length === 0)) {
      throw new BadRequestException('A user with type "contact" must be assigned to at least one client upon creation.');
    }

    // === LAYER 2 & 3: SECURITY AND DATA SILO VALIDATION ===
    if (createUserDto.clientIds && createUserDto.clientIds.length > 0) {
      // Layer 2: Can the admin assign these clients?
      await this._validateClientAssignmentScope(createUserDto.clientIds, requestingUser);

      // Layer 3: Does this assignment violate the Subsidiary Containment rule?
      if (createUserDto.userType === UserType.CONTACT) {
        await this._validateContactSubsidiaryContainmentOnCreate(createUserDto.clientIds);
      }
    }

    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('user', 'USR');
    const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

    const { roleId, clientIds, password, preferences, ...restOfDto } = createUserDto;
    const payload: Partial<User> = { ...restOfDto, recordId };

    payload.name = `${createUserDto.firstName} ${createUserDto.lastName}`;
    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }
    if (password) { payload.password = await bcrypt.hash(password, 10); }
    if (preferences) {
      payload.preferences = {
        theme: preferences.theme || 'auto'
      };
    }

    const userToCreate = new this.userModel(payload);
    try {
      return await userToCreate.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists.');
      }
      throw error;
    }
  }

  async findAll(query: QueryUserDto, requestingUser: UserDocument): Promise<UserDocument[]> {
    const queryBuilder = new UserQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.userModel.find(filter).exec();
  }

  async findAllByClientId(clientId: string, queryDto: QueryUserDto, requestingUser: UserDocument): Promise<UserDocument[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter.clientIds = new Types.ObjectId(clientId);
    return this.userModel.find(filter).exec();
  }

  async findAllByRoleId(roleId: string, queryDto: QueryUserDto, requestingUser: UserDocument): Promise<UserDocument[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter.roleId = new Types.ObjectId(roleId);
    return this.userModel.find(filter).exec();
  }

  /**
   * Finds a single user by their ID, ensuring the requesting user has permission to view them.
   * @param userId - The ID of the user to find.
   * @param requestingUser - The authenticated user making the request.
   * @returns The found user document.
   */
  async findOne(userId: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<UserDocument> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new UserQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = { $and: [securityFilter, { _id: new Types.ObjectId(userId) }] };

    const targetUser = await this.userModel.findOne(finalFilter).populate('roleId').exec();

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
   * @param requestingUser - The authenticated user making the request.
   * @returns The updated user document.
   */
  async update(userId: string, updateUserDto: UpdateUserDto, requestingUser: UserDocument): Promise<UserDocument> {
    const hasEditPermission = ((requestingUser.roleId as any)?.permissions || []).includes(PERMISSIONS.USER_EDIT);

    if (userId !== requestingUser.id) { // To update others, you MUST have the USER_EDIT permission.
      if (!hasEditPermission) throw new ForbiddenException('You do not have permission to edit other users.');
    }
    else {
      // If they DON'T have the general USER_EDIT permission, they are restricted to personal info.
      if (!hasEditPermission) {
        const allowedFields = ['firstName', 'lastName', 'email', "password", 'preferences'];
        const attemptedFields = Object.keys(updateUserDto);
        const unauthorizedFields = attemptedFields.filter(field => !allowedFields.includes(field));

        if (unauthorizedFields.length > 0) {
          throw new ForbiddenException(`You are only permitted to update your personal information. Unauthorized fields: ${unauthorizedFields.join(', ')}`);
        }
      }
    }

    const existingUser = await this.findOne(userId, requestingUser, { includeInactive: true }); // Layer 2 User Check

    // === LAYER 2 & 3: SECURITY AND DATA SILO VALIDATION (for client changes) ===
    if (updateUserDto.clientIds) {
      // Layer 2: Can the admin assign these clients?
      await this._validateClientAssignmentScope(updateUserDto.clientIds, requestingUser);

      // Layer 3: Does this assignment violate the Subsidiary Containment rule?
      if (existingUser.userType === UserType.CONTACT) {
        await this._validateContactSubsidiaryContainmentOnUpdate(existingUser, updateUserDto.clientIds);
      }
    }

    const updatePayload = await this._prepareUpdatePayload(updateUserDto, existingUser, requestingUser);
    
    const updateOp: any = { $set: updatePayload, $inc: { __v: 1 } };
    if (updatePayload.password) {
      updateOp.$inc.tokenVersion = 1;
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId, __v: updateUserDto.__v },
      updateOp,
      { new: true }
    ).exec();

    if (!updatedUser) {
      throw new ConflictException('Update failed due to a version conflict. The record has been modified by another user. Please reload and try again.');
    }
    return updatedUser;
  }

  /**
   * Invalidates all existing tokens for a user by incrementing their token version.
   * @param userId - The ID of the user to invalidate tokens for.
   */
  async invalidateTokens(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
  }

  /**
   * Deletes a user, ensuring the requesting user has permission to do so.
   * Enforces business rule: Contact users cannot delete other users.
   * @param userId - The ID of the user to delete.
   * @param requestingUser - The authenticated user making the request.
   * @returns The soft-deleted user document.
   */
  async remove(userId: string, requestingUser: UserDocument): Promise<UserDocument> {
    // === LAYER 2 VALIDATION: findOne serves as the authorization check ===
    await this.findOne(userId, requestingUser);

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const deletedUser = await handleConcurrentSoftDelete<UserDocument>(this.userModel, userId, session, 'User');

      await session.commitTransaction();
      return deletedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
 * LAYER 2 VALIDATION
 * Checks if the requesting user has the required visibility scope to assign a list of clients.
 * @private
 */
  private async _validateClientAssignmentScope(clientIdsToAssign: string[], requestingUser: UserDocument): Promise<void> {
    const accessibleClientIds = await this.clientResolverService.resolveClientIdsForUser(requestingUser);

    if (accessibleClientIds.has('GLOBAL_ACCESS')) return; // Global admin can assign any client.

    const unauthorizedClients = clientIdsToAssign.filter(id => !accessibleClientIds.has(id));
    if (unauthorizedClients.length > 0) {
      throw new ForbiddenException(`You do not have permission to manage user assignments for clients: ${unauthorizedClients.join(', ')}`);
    }
  }

  /**
 * LAYER 3 VALIDATION (CREATE)
 * Enforces the Subsidiary Containment rule for a NEW contact user.
 * All initially assigned clients must belong to the same subsidiary.
 * @private
 */
  private async _validateContactSubsidiaryContainmentOnCreate(clientIds: string[]): Promise<void> {
    if (clientIds.length <= 1) return; // Rule doesn't apply if only one client is assigned.

    const clients = await this.clientModel.find({ _id: { $in: clientIds } }).select('subsidiaryId name').exec();
    if (clients.length !== clientIds.length) {
      throw new BadRequestException('One or more client IDs provided are invalid.');
    }

    const firstSubsidiaryId = clients[0].subsidiaryId?.toString();
    const isConsistent = clients.every(c => c.subsidiaryId?.toString() === firstSubsidiaryId);

    if (!isConsistent) {
      throw new BadRequestException('A contact user can only be assigned to clients that belong to the same subsidiary.');
    }
  }

  /**
   * LAYER 3 VALIDATION (UPDATE)
   * Enforces the Subsidiary Containment rule when UPDATING a contact user.
   * Business Rules:
   * - A contact user from a standalone client cannot be assigned to a client within a subsidiary.
   * - A contact user from a subsidiary cannot be assigned to a standalone client.
   * - A contact user cannot be assigned to clients outside of their original subsidiary silo.
   * @private
   */
  private async _validateContactSubsidiaryContainmentOnUpdate(userToUpdate: UserDocument, newClientIds: string[]): Promise<void> {
    // Helper function to determine the "silo" of a set of clients.
    // A silo is either a single subsidiary ID or the string 'STANDALONE'.
    const getClientSilo = (clients: { subsidiaryId?: Types.ObjectId }[]): string | null => {
      if (clients.length === 0) return null; // An empty set has no silo.

      const subsidiaryIds = new Set(clients.map(c => c.subsidiaryId?.toString()).filter(Boolean));

      if (subsidiaryIds.size > 1) {
        throw new BadRequestException('A contact user cannot be assigned to clients in multiple different subsidiaries in the same operation.');
      }

      if (subsidiaryIds.size === 1) return [...subsidiaryIds][0]!;

      // No subsidiary IDs found means this is a "standalone" silo.
      return 'STANDALONE';
    };

    const originalClients = await this.clientModel.find({ _id: { $in: userToUpdate.clientIds } }).select('subsidiaryId').exec();
    const originalSilo = getClientSilo(originalClients);

    // Check for unassigned state. This should be an impossible state so raise error if so.
    if (!originalSilo) {
      console.error(`Data integrity violation: Contact user ${userToUpdate.recordId} has no assigned clients.`);
      throw new BadRequestException('A contact user cannot be in an unassigned state.');
    }

    // Get the target silo for the new assignment.
    const newClients = await this.clientModel.find({ _id: { $in: newClientIds } }).select('subsidiaryId').exec();
    if (newClients.length !== newClientIds.length) {
      throw new BadRequestException('One or more client IDs provided for assignment are invalid.');
    }
    const targetSilo = getClientSilo(newClients);

    // If the target list is empty, it's an attempt to de-assign the contact, which is forbidden.
    if (!targetSilo) {
      throw new BadRequestException('A contact user cannot be left unassigned from all clients.');
    }

    // The silos must be IDENTICAL. This single check handles all cases.
    if (originalSilo !== targetSilo) {
      throw new BadRequestException('A contact user cannot be moved between different subsidiaries or between a subsidiary and a standalone client.');
    }
  }

  /**
 * Counts active, non-deleted users associated with a specific client.
 * Used as a pre-condition check before deactivating a client.
 * @param clientId The ID of the parent client.
 * @returns The number of active users assigned to the client.
 */
  async countActiveByClientId(clientId: string): Promise<number> {
    return this.userModel.countDocuments({
      clientIds: new Types.ObjectId(clientId),
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
      roleId: new Types.ObjectId(roleId),
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
      _id: new Types.ObjectId(userId),
      isActive: true,
      isDeleted: false,
    }).exec();
    return !!existingUser;
  }

  /**
 * Validates that all user IDs in an array exist, are active and not deleted
 * @param userIds - An array of user IDs to validate.
 * @returns `true` if all IDs are valid users, `false` otherwise.
 */
  async validateUserIds(userIds: string[]): Promise<boolean> {
    if (!userIds || userIds.length === 0) return true;

    const activeUsersCount = await this.userModel.countDocuments({
      _id: { $in: userIds.map(id => new Types.ObjectId(id)) },
      isActive: true,
      isDeleted: false,
    });
    return activeUsersCount === userIds.length;
  }

  /**
 * Finds a single user by their unique recordId and populates their role.
 * This is specifically used for authentication lookups.
 * @param recordId The user's unique recordId (from JWT `sub` claim)
 * @returns A user document with the role populated, or null if not found.
 */
  async findOneByRecordIdAndPopulateRole(recordId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ recordId })
      .populate({
        path: 'roleId',
        model: 'Role',
      })
      .exec();
  }

  /**
 * Finds a single user by their email and populates their role.
 * This is specifically used for the local authentication login process.
 * @param email The user's email address.
 * @returns A user document with the role populated, or null if not found.
 */
async findOneByEmailAndPopulateRole(email: string): Promise<UserDocument | null> {
  return this.userModel
    .findOne({ email })
    .select('+password') // Explicitly select password as it is hidden by default
    .populate({
      path: 'roleId',
      model: 'Role',
    })
    .exec();
}

  /**
   * Validates a user's password.
   * @param email - The user's email.
   * @param pass - The password to validate.
   * @returns The user document if validation succeeds, null otherwise.
   */
  async validateUser(email: string, pass: string): Promise<UserDocument | null> {
    const user = await this.findOneByEmailAndPopulateRole(email);
    if (user && user.password && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return user;
    }
    return null;
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }, // Check if expiration is in the future
    });
  }

  async updatePasswordAndClearToken(userId: string, newPasswordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { password: newPasswordHash },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
      $inc: { tokenVersion: 1 },
    });
  }

  /**
 * Prepares the payload for an EXISTING user update.
 * Handles partial updates, derived fields, and authorization for sensitive fields.
 * @private
 */
  private async _prepareUpdatePayload(dto: UpdateUserDto, existingUser: UserDocument, loggedInUser: UserDocument): Promise<Partial<UserDocument>> {
    const { roleId, clientIds, isActive, password, preferences, __v, ...restOfDto } = dto;
    const payload: Partial<UserDocument> = { ...restOfDto };

    if (payload.firstName || payload.lastName) {
      payload.name = `${payload.firstName || existingUser.firstName} ${payload.lastName || existingUser.lastName}`;
    }

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }
    if (password) { 
      payload.password = await bcrypt.hash(password, 10);
      // tokenVersion increment is handled in the update method via $inc
    }
    if (preferences) {
      payload.preferences = {
        theme: preferences.theme || 'auto'
      };
    }

    // System Constraint: Only roles with CLIENT_MANAGE_INACTIVE permissions can change Client status.
    // This prevents non-admin users from turning off key master data records
    if (dto.isActive !== undefined) {
      if (!((loggedInUser.roleId as any)?.permissions || []).includes(PERMISSIONS.USER_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      payload.isActive = isActive;
    }
    return payload;
  }
}