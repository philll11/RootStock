import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { Client, ClientDocument } from './schemas/client.schema';
import { ClientQueryBuilder } from './builders/clients-query.builder';
import { ClientResolverService } from './client-resolver/client-resolver.service';

import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../orchards/schemas/orchard.schema';


import { PERMISSIONS } from '../common/constants/permissions.constants';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Orchard.name) private orchardModel: Model<OrchardDocument>,
    @InjectConnection() private connection: Connection,
    private readonly usersService: UsersService,
    private readonly clientResolverService: ClientResolverService,
  ) { }


  async create(createClientDto: CreateClientDto): Promise<Client> {
    return this.clientModel.create(createClientDto);
  }
  async findAll(query: QueryClientDto, user: User): Promise<Client[]> {
    const queryBuilder = new ClientQueryBuilder(query, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.clientModel.find(filter).exec();
  }

  async findAllBySubsidiaryId(subsidiaryId: string, queryDto: QueryClientDto, user: User): Promise<Client[]> {
    const queryBuilder = new ClientQueryBuilder(queryDto, user, this.clientResolverService);
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
    const queryBuilder = new ClientQueryBuilder({}, user, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = {
      $and: [
        securityFilter,
        { _id: new Types.ObjectId(clientId) }
      ]
    };

    const client = await this.clientModel.findOne(finalFilter).exec();
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

      // Check for child User records
      const activeUserCount = await this.usersService.countActiveByClientId(clientId);
      if (activeUserCount > 0) {
        throw new ConflictException(`This client cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign or deactivate the users first.`);
      }

      // Check for child Orchard records
      const activeOrchardCount = await this.orchardModel.countDocuments({ clientId: new Types.ObjectId(clientId), isActive: true, isDeleted: false });
      if (activeOrchardCount > 0) {
        throw new ConflictException(`This client cannot be deactivated because it has ${activeOrchardCount} active orchard(s). Please deactivate the orchards first.`);
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

      // Disassociate users from this client
      await this.userModel.updateMany({ clientIds: clientId }, { $pull: { clientIds: clientId } }, { session }).exec();

      // Soft-delete associated orchards
      await this.orchardModel.updateMany({ clientId: new Types.ObjectId(clientId) }, { isDeleted: true, isActive: false }, { session }).exec();

      // Soft-delete the client itself
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
 * Validates that a single client ID exists, is active, and not deleted.
 * @param clientId - A single client ID string to validate.
 * @returns `true` if the ID is valid, `false` otherwise.
 */
  async validateSingleClientId(clientId: string): Promise<boolean> {
    if (!clientId) {
      return false;
    }
    const client = await this.clientModel.findOne({
      _id: new Types.ObjectId(clientId),
      isActive: true,
      isDeleted: false,
    });
    return !!client; // Returns true if client is found, false otherwise
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
   * Prepares the final, type-safe payload for a client update operation.
   * Handles permission-based field-level security.
   * @private
   */
  private _prepareUpdatePayload(updateClientDto: UpdateClientDto, user: User): Partial<Client> {
    const { subsidiaryId, isActive, ...restOfDto } = updateClientDto;
    const updatePayload: Partial<Client> = { ...restOfDto };

    const userPermissions = (user.roleId as any)?.permissions || [];

    // System Constraint: Only roles with CLIENT_EDIT_STATUS permissions can change Client status.
    // This prevents non-admin users from turning off key master data records
    if (updateClientDto.isActive !== undefined) {
      if (!userPermissions.includes(PERMISSIONS.CLIENT_EDIT_STATUS)) {
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