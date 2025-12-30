// backend/src/clients/clients.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { Client, ClientDocument } from './schemas/client.schema';
import { ClientQueryBuilder } from './builders/clients-query.builder';
import { ClientResolverService } from '../client-resolver/client-resolver.service';

import { UsersService } from '../users/users.service';
import { User, UserDocument, UserType } from '../users/schemas/user.schema';
import { OrchardsService } from '../../assets/orchards/orchards.service';

import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { CountersService } from '../../system/counters/counters.service';
import { handleConcurrentSoftDelete } from '../../common/utils/concurrent-deletion.util';
import { VisibilityScope } from '../roles/schemas/role.schema';


@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => OrchardsService))
    private readonly orchardsService: OrchardsService,
    private readonly clientResolverService: ClientResolverService,
    private readonly countersService: CountersService,
  ) { }

  async create(createClientDto: CreateClientDto, requestingUser: UserDocument): Promise<ClientDocument> {
    // === LAYER 2 VALIDATION: A user can only create a client within a subsidiary they have access to ===
    if (createClientDto.subsidiaryId) {
      const accessibleSubs = await this.clientResolverService.getAccessibleSubsidiaryIdsForUser(requestingUser);
      const isAllowed = accessibleSubs.some(id => id.toString() === createClientDto.subsidiaryId);
      // Global users don't get a list of subs, so we must check their scope directly.
      const userRole = requestingUser.roleId as any;
      if (!isAllowed && userRole.visibilityScope !== VisibilityScope.GLOBAL) {
        throw new ForbiddenException(`You do not have permission to create a client under subsidiary ID "${createClientDto.subsidiaryId}".`);
      }
    }

    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('client', 'CLI');
    const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

    const newClient = new this.clientModel({ ...createClientDto, recordId });
    return newClient.save();
  }

  async findAll(query: QueryClientDto, requestingUser: UserDocument): Promise<ClientDocument[]> {
    const queryBuilder = new ClientQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.clientModel.find(filter).exec();
  }

  async findAllBySubsidiaryId(subsidiaryId: string, queryDto: QueryClientDto, requestingUser: UserDocument): Promise<ClientDocument[]> {
    const queryBuilder = new ClientQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter.subsidiaryId = new Types.ObjectId(subsidiaryId);
    return this.clientModel.find(filter).exec();
  }

  /**
   * Finds a single client by its ID, ensuring the requesting user has permission to view it.
   * @param clientId - The ID of the client to find.
   * @param requestingUser - The authenticated user making the request.
   * @returns The found client document.
   */
  async findOne(clientId: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<ClientDocument> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new ClientQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = { $and: [securityFilter, { _id: new Types.ObjectId(clientId) }] };

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
   * @param requestingUser - The authenticated user making the request.
   * @returns The updated client document.
   */
  async update(clientId: string, updateClientDto: UpdateClientDto, requestingUser: UserDocument): Promise<ClientDocument> {
    // The DTO and schema now prevent subsidiaryId from being changed. This check simplifies significantly.
    const clientToUpdate = await this.findOne(clientId, requestingUser, { includeInactive: true });

    if (updateClientDto.isActive === false) {
      const activeUserCount = await this.usersService.countActiveByClientId(clientId);
      if (activeUserCount > 0) {
        throw new ConflictException(`This client cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it.`);
      }
      const activeOrchardCount = await this.orchardsService.countActiveByClientId(clientId);
      if (activeOrchardCount > 0) {
        throw new ConflictException(`This client cannot be deactivated because it has ${activeOrchardCount} active orchard(s).`);
      }
    }

    const { isActive, __v, ...restOfDto } = updateClientDto;
    const updatePayload: Partial<Client> = { ...restOfDto };

    if (isActive !== undefined) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.CLIENT_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      updatePayload.isActive = isActive;
    }

    const updatedClient = await this.clientModel.findOneAndUpdate(
      { _id: clientId, __v: updateClientDto.__v },
      { $set: updatePayload, $inc: { __v: 1 } },
      { new: true }
    ).exec();

    if (!updatedClient) {
      throw new ConflictException('Update failed due to a version conflict. The record has been modified by another user. Please reload and try again.');
    }
    return updatedClient;
  }

  /**
* Handles assigning users to this client, enforcing all security layers.
* Corresponds to the `PUT /clients/:id/users` endpoint.
*/
  async assignUsers(clientId: string, userIdsToAssign: string[], requestingUser: UserDocument): Promise<void> {
    const client = await this.findOne(clientId, requestingUser); // Layer 2 check

    if (userIdsToAssign.length === 0) {
      // If clearing users, just remove this client from everyone.
      await this.userModel.updateMany({ clientIds: clientId }, { $pull: { clientIds: clientId } }).exec();
      return;
    }

    const usersToAssign = await this.userModel.find({ _id: { $in: userIdsToAssign } }).select('userType clientIds recordId').exec();
    if (usersToAssign.length !== userIdsToAssign.length) {
      throw new BadRequestException('One or more user IDs provided are invalid.');
    }

    // LAYER 3 VALIDATION: Enforce Subsidiary Containment for 'contact' users.
    for (const user of usersToAssign) {
        if (user.userType === UserType.CONTACT) {
            await this._validateContactAssignmentRule(client, user);
        }
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // Remove the client from users who are no longer in the list.
      await this.userModel.updateMany({ clientIds: clientId, _id: { $nin: userIdsToAssign } }, { $pull: { clientIds: clientId } }, { session });
      // Add the client to all users in the new list.
      await this.userModel.updateMany({ _id: { $in: userIdsToAssign } }, { $addToSet: { clientIds: clientId } }, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Deletes a client, ensuring the requesting user has permission to do so.
   * @param clientId - The ID of the client to delete.
   * @param requestingUser - The authenticated user making the request.
   * @returns The soft-deleted client document.
   */
  async remove(clientId: string, requestingUser: UserDocument): Promise<ClientDocument> {
    await this.findOne(clientId, requestingUser); // Layer 2 Client Check

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const deletedClient = await handleConcurrentSoftDelete<ClientDocument>(this.clientModel, clientId, session, 'Client');
      await this.userModel.updateMany({ clientIds: clientId }, { $pull: { clientIds: clientId } }, { session }).exec();

      // TODO: Evaluate whether we should soft-delete orchards as well or simply throw a 409 Conflict
      await this.orchardsService.softDeleteByClientId(clientId, session);

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
   * LAYER 3 VALIDATION HELPER
   * Enforces the Strict Data Silo rule for contact user assignments.
   * - If target is in a sub, contact must also be from that sub.
   * - If target is standalone, contact cannot be from any sub.
   * @private
   */
  private async _validateContactAssignmentRule(targetClient: ClientDocument, contactUser: UserDocument): Promise<void> {
    // Find all clients the contact is currently assigned to.
    const contactCurrentClients = await this.clientModel.find({ _id: { $in: contactUser.clientIds } }).select('subsidiaryId').exec();

    if (contactCurrentClients.length === 0) return; // No existing clients means no conflict.

    if (targetClient.subsidiaryId) {
      // CASE 1: The target client is IN a subsidiary.
      // The contact must already belong to at least one client in that SAME subsidiary.
      const targetSubId = targetClient.subsidiaryId.toString();
      const contactBelongsToTargetSub = contactCurrentClients.some(c => c.subsidiaryId?.toString() === targetSubId);
      if (!contactBelongsToTargetSub) {
        throw new BadRequestException(`Contact user ${contactUser.recordId} belongs to a different subsidiary and cannot be assigned to this client.`);
      }
    } else {
      // CASE 2: The target client is STANDALONE.
      // The contact must NOT belong to any client that is part of a subsidiary.
      const contactBelongsToAnySub = contactCurrentClients.some(c => !!c.subsidiaryId);
      if (contactBelongsToAnySub) {
        throw new BadRequestException(`Contact user ${contactUser.recordId} belongs to a subsidiary and cannot be assigned to a standalone client.`);
      }
    }
  }

  /**
 * Validates that all client IDs in an array exist, are active, and not deleted.
 * @param clientIds - An array of client IDs to validate.
 * @returns `true` if all IDs are valid, `false` otherwise.
 */
  async validateClientIds(clientIds: string[]): Promise<boolean> {
    if (!clientIds || clientIds.length === 0) return true;
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
    if (!clientId) return false;
    try {
      const client = await this.clientModel.findOne({
        _id: new Types.ObjectId(clientId),
        isActive: true,
        isDeleted: false,
      });
      return !!client; // Returns true if client is found, false otherwise
    } catch (error) {
      // Handle malformed ObjectId gracefully
      return false;
    }
  }

  /**
 * Counts active, non-deleted clients associated with a specific subsidiary.
 * This is used as a pre-condition check before deactivating a subsidiary.
 * @param subsidiaryId The ID of the parent subsidiary.
 * @returns The number of active clients.
 */
  async countActiveBySubsidiaryId(subsidiaryId: string): Promise<number> {
    return this.clientModel.countDocuments({
      subsidiaryId: new Types.ObjectId(subsidiaryId),
      isActive: true,
      isDeleted: false,
    }).exec();
  }


}