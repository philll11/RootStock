import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument, UserType } from './entities/user.schema';
import { UserQueryBuilder } from './builders/user-query.builder';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

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

  /**
   * Finds all users based on the provided query parameters.
   * @param query - The query parameters to filter users.
   * @returns A list of users matching the query.
   */
  async findAll(query: QueryUserDto, loggedInUserRole: string): Promise<User[]> {

    const queryBuilder = new UserQueryBuilder(query, loggedInUserRole);
    const filter = queryBuilder.build();

    return this.userModel.find(filter).exec();
  }

  /**
   * Finds a user by their ID, ensuring they are active and not deleted.
   * @param userId - The ID of the user to find.
   * @returns The found user document.
   */
  async findOne(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: false, isActive: true }).exec();

    if (!user) {
      throw new NotFoundException(`Active user with ID "${userId}" not found`);
    }

    return user;
  }

  /**
   * Updates a user based on the provided DTO and the role of the logged-in user.
   * Handles permissions for changing active status and updates name based on first and last names.
   * @param userId - The ID of the user to update.
   * @param updateUserDto - The DTO containing update data.
   * @param loggedInUserRole - The role of the user performing the update.
   * @returns The updated user document.
   */
  async update(userId: string, updateUserDto: UpdateUserDto, loggedInUserRole: string): Promise<User> {
    const existingUser = await this._findUserForUpdate(userId, loggedInUserRole);

    if (existingUser.userType === UserType.CONTACT && 'clientIds' in updateUserDto) {
      throw new ForbiddenException(
        'The client assignment for a contact user cannot be changed. Please delete and recreate the user to reassign.',
      );
    }

    const updatePayload = this._prepareUpdatePayload(updateUserDto, existingUser, loggedInUserRole);

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
   * Deletes a user by marking them as deleted and inactive.
   * @param userId - The ID of the user to delete.
   * @returns The deleted user document.
   */
  async remove(userId: string): Promise<User> {
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
   * Checks if a user exists, is active, and is not deleted.
   * This can be used by custom validators in other modules.
   * @param userId - The ID of the user to check.
   * @returns `true` if the user is valid, `false` otherwise.
   */
  async isUserExistingAndActive(userId: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({
      _id: userId,
      isActive: true,
      isDeleted: false,
    });
    return count > 0;
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
  private _prepareUpdatePayload(dto: UpdateUserDto, existingUser: User, loggedInUserRole: string,): Partial<User> {
    const { roleId, clientIds, isActive, ...restOfDto } = dto;
    const payload: Partial<User> = { ...restOfDto };

    if (payload.firstName || payload.lastName) {
      const newFirstName = payload.firstName || existingUser.firstName;
      const newLastName = payload.lastName || existingUser.lastName;
      payload.name = `${newFirstName} ${newLastName}`;
    }

    if (roleId) { payload.roleId = new Types.ObjectId(roleId); }
    if (clientIds) { payload.clientIds = clientIds.map(id => new Types.ObjectId(id)); }

    if ('isActive' in dto) {
      if (loggedInUserRole !== 'Administrator') {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      payload.isActive = isActive;
    }

    return payload;
  }
}