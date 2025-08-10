import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { Client, ClientDocument } from './schemas/client.schema';
import { ClientQueryBuilder } from './builders/clients-query.builder';

import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private readonly usersService: UsersService,
  ) { }


  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }
  async findAll(query: QueryClientDto, user: User): Promise<Client[]> {
    const queryBuilder = new ClientQueryBuilder(query, user, this.clientModel);
    const filter = await queryBuilder.build();
    return this.clientModel.find(filter).exec();
  }

  async findAllBySubsidiaryId(subsidiaryId: string, queryDto: QueryClientDto, user: User): Promise<Client[]> {
    const queryBuilder = new ClientQueryBuilder(queryDto, user, this.clientModel);
    const filter = await queryBuilder.build();
    filter.subsidiaryId = new Types.ObjectId(subsidiaryId);
    return this.clientModel.find(filter).exec();
  }

  /**
   * Finds a single client by its ID, ensuring the requesting user has permission to view it.
   * @param clientId - The ID of the client to find.
   * @param user - The authenticated user making the request.
   * @returns The found client document.
   */
  async findOne(clientId: string, user: User): Promise<Client> {
    const queryBuilder = new ClientQueryBuilder({}, user, this.clientModel);
    const filter = await queryBuilder.build();

    filter._id = new Types.ObjectId(clientId);

    const client = await this.clientModel.findOne(filter).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID "${clientId}" not found or you do not have permission to view it.`);
    }
    return client;
  }

  /**
   * Updates a client, ensuring the requesting user has permission to modify it.
   * @param clientId - The ID of the client to update.
   * @param updateClientDto - The DTO containing update data.
   * @param user - The authenticated user making the request.
   * @returns The updated client document.
   */
  async update(clientId: string, updateClientDto: UpdateClientDto, user: User): Promise<Client> {
    await this.findOne(clientId, user); // Will raise error if user does not have permission to view record

    if (updateClientDto.isActive === false) {
      const activeUserCount = await this.usersService.countActiveByClientId(clientId);
      if (activeUserCount > 0) {
        throw new ConflictException(`This client cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign or deactivate the users first.`);
      }
    }

    const updatePayload = this._prepareUpdatePayload(updateClientDto, user);

    const updatedClient = await this.clientModel.findByIdAndUpdate(
      clientId,
      { $set: updatePayload },
      { new: true }
    ).exec();

    if (!updatedClient) {
      throw new NotFoundException(`Client with ID "${clientId}" could not be updated.`);
    }
    return updatedClient;
  }

  /**
   * Deletes a client, ensuring the requesting user has permission to do so.
   * @param clientId - The ID of the client to delete.
   * @param user - The authenticated user making the request.
   * @returns The soft-deleted client document.
   */
  async remove(clientId: string, user: User): Promise<Client> {
    await this.findOne(clientId, user); // Will raise error if user does not have permission to view record

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      await this.userModel.updateMany({ clientIds: clientId }, { $pull: { clientIds: clientId } }, { session }).exec();
      const deletedClient = await this.clientModel.findByIdAndUpdate(
        clientId,
        { isDeleted: true, isActive: false },
        { session, new: true }
      ).exec();

      if (!deletedClient) {
        throw new NotFoundException(`Client with ID "${clientId}" not found`);
      }

      await session.commitTransaction();
      return deletedClient;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }


  /**
 * Validates that all client IDs in an array exist, are active, and not deleted.
 * @param clientIds - An array of client IDs to validate.
 * @returns `true` if all IDs are valid, `false` otherwise.
 */
  async validateClientIds(clientIds: string[]): Promise<boolean> {
    if (!clientIds || clientIds.length === 0) {
      return true;
    }
    const activeClientsCount = await this.clientModel.countDocuments({
      _id: { $in: clientIds },
      isActive: true,
      isDeleted: false,
    });
    return activeClientsCount === clientIds.length;
  }

  /**
 * Counts active, non-deleted clients associated with a specific subsidiary.
 * This is used as a pre-condition check before deactivating a subsidiary.
 * @param subsidiaryId The ID of the parent subsidiary.
 * @returns The number of active clients.
 */
  async countActiveBySubsidiaryId(subsidiaryId: string): Promise<number> {
    return this.clientModel.countDocuments({
      subsidiaryId: subsidiaryId,
      isActive: true,
      isDeleted: false,
    }).exec();
  }

  /**
 * Finds a client for an update operation, applying role-based permissions.
 * Throws a NotFoundException if the client doesn't exist or permissions fail.
 * @private
 */
  private async _findClientForUpdate(clientId: string, loggedInUserRole: string): Promise<ClientDocument> {
    const queryCondition: any = {
      _id: clientId,
      isDeleted: false,
    };

    // Only admins can view inactive master records.
    if (loggedInUserRole !== 'Administrator') {
      queryCondition.isActive = true;
    }

    const client = await this.clientModel.findOne(queryCondition).exec();

    if (!client) {
      throw new NotFoundException(
        `Client with ID "${clientId}" not found.`,
      );
    }
    return client;
  }

  /**
 * Prepares the final, type-safe payload for a client update operation.
 * Handles role-based field permissions.
 * @private
 */
  private _prepareUpdatePayload(updateClientDto: UpdateClientDto, user: User): Partial<Client> {
    const { subsidiaryId, isActive, ...restOfDto } = updateClientDto;
    const updatePayload: Partial<Client> = { ...restOfDto };
    const userRoleName = (user.roleId as any)?.name;

    if ('isActive' in updateClientDto) {
      if (userRoleName !== 'Administrator') {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      updatePayload.isActive = isActive;
    }

    if (subsidiaryId) {
      updatePayload.subsidiaryId = new Types.ObjectId(subsidiaryId);
    }
    return updatePayload;
  }
}