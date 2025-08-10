import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument, UserType } from './schemas/user.schema';
import { UserQueryBuilder } from './builders/user-query.builder';

import { Client, ClientDocument } from '../clients/schemas/client.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) { }

  /**
   * Creates a new user based on the provided DTO.
   * Converts string IDs to ObjectId types for role and client associations.
   * @param createUserDto - The DTO containing user creation data.
   * @returns The created user document.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const payload = this._prepareCreatePayload(createUserDto);
    const createdUser = new this.userModel(payload);
    return createdUser.save();
  }

  async findAll(query: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(query, user, this.clientModel);
    const filter = await queryBuilder.build();
    return this.userModel.find(filter).exec();
  }

  async findAllByClientId(clientId: string, queryDto: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, user, this.clientModel);
    const filter = await queryBuilder.build();
    filter.clientIds = new Types.ObjectId(clientId);
    return this.userModel.find(filter).exec();
  }

  async findAllByRoleId(roleId: string, queryDto: QueryUserDto, user: User): Promise<User[]> {
    const queryBuilder = new UserQueryBuilder(queryDto, user, this.clientModel);
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
  async findOne(userId: string, user: User): Promise<User> {
    const queryBuilder = new UserQueryBuilder({}, user, this.clientModel);
    const filter = await queryBuilder.build();
    filter._id = new Types.ObjectId(userId);

    const targetUser = await this.userModel.findOne(filter).exec();
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found or you do not have permission to view it.`);
    }
    return targetUser;
  }

  /**
   * Updates a user, ensuring the requesting user has permission to modify them.
   * @param userId - The ID of the user to update.
   * @param updateUserDto - The DTO containing update data.
   * @param user - The authenticated user making the request.
   * @returns The updated user document.
   */
  async update(userId: string, updateUserDto: UpdateUserDto, user: User): Promise<User> {
    const existingUser = await this.findOne(userId, user); // Secure findOne doubles as authorization check

    if (existingUser.userType === UserType.CONTACT && 'clientIds' in updateUserDto) {
      throw new ForbiddenException('The client assignment for a contact user cannot be changed.');
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
   * @param userId - The ID of the user to delete.
   * @param user - The authenticated user making the request.
   * @returns The soft-deleted user document.
   */
  async remove(userId: string, user: User): Promise<User> {
    await this.findOne(userId, user); // Secure authorization check

    const deletedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { isDeleted: true, isActive: false },
      { new: true },
    ).exec();

    if (!deletedUser) {
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
 * Finds a user for an update operation, applying role-based permissions.
 * Throws a NotFoundException if the user doesn't exist or permissions fail.
 * @private
 */
  private async _findUserForUpdate(userId: string, loggedInUserRole: string): Promise<UserDocument> {
    const queryCondition: any = {
      _id: userId,
      isDeleted: false,
    };

    // Only admins can view inactive master records.
    if (loggedInUserRole !== 'Administrator') {
      queryCondition.isActive = true;
    }

    const user = await this.userModel.findOne(queryCondition).exec();

    if (!user) {
      throw new NotFoundException(
        `User with ID "${userId}" not found.`,
      );
    }
    return user;
  }

  /**
 * Prepares the payload for a NEW user.
 * Derives 'name' and transforms string IDs to ObjectIds.
 * @private
 */
  private _prepareCreatePayload(dto: CreateUserDto): Partial<User> {
    const { roleId, clientIds, ...restOfDto } = dto;
    const payload: Partial<User> = { ...restOfDto };

    payload.name = `${dto.firstName} ${dto.lastName}`;

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }

    return payload;
  }

  /**
 * Prepares the payload for an EXISTING user update.
 * Handles partial updates, derived fields, and authorization for sensitive fields.
 * @private
 */
  private _prepareUpdatePayload(dto: UpdateUserDto, existingUser: User, loggedInUser: User): Partial<User> {
    const { roleId, clientIds, isActive, ...restOfDto } = dto;
    const payload: Partial<User> = { ...restOfDto };
    const loggedInUserRoleName = (loggedInUser.roleId as any)?.name;

    if (payload.firstName || payload.lastName) {
      const newFirstName = payload.firstName || existingUser.firstName;
      const newLastName = payload.lastName || existingUser.lastName;
      payload.name = `${newFirstName} ${newLastName}`;
    }

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }

    if ('isActive' in dto) {
      if (loggedInUserRoleName !== 'Administrator') {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      payload.isActive = isActive;
    }
    return payload;
  }
}