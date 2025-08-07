import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { Client, ClientDocument } from './entities/client.schema';
import { ClientQueryBuilder } from './builders/clients-query.builder';

@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private clientModel: Model<ClientDocument>) { }

  
  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  async findAll(query: QueryClientDto, loggedInUserRole: string): Promise<Client[]> {
    
    const queryBuilder = new ClientQueryBuilder(query, loggedInUserRole);
    const filter = queryBuilder.build();

    return this.clientModel.find(filter).exec();
  }

  async findOne(clientId: string): Promise<Client> {
    const client = await this.clientModel.findOne({ _id: clientId, isDeleted: false, isActive: true }).exec();

    if (!client) {
      throw new NotFoundException(`Active client with ID "${clientId}" not found`);
    }

    return client;
  }

  async update(clientId: string, updateClientDto: UpdateClientDto, loggedInUserRole: string): Promise<Client> {
    const existingClient = await this._findClientForUpdate(clientId, loggedInUserRole);

    const updatePayload = this._prepareUpdatePayload(updateClientDto, loggedInUserRole);

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

  async remove(clientId: string): Promise<Client> {
    const deletedClient = await this.clientModel.findByIdAndUpdate(
      clientId,
      { isDeleted: true, isActive: false },
      { new: true },
    ).exec();

    if (!deletedClient) {
      throw new NotFoundException(`Client with ID "${clientId}" not found`);
    }

    return deletedClient;
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
  private _prepareUpdatePayload(updateClientDto: UpdateClientDto, loggedInUserRole: string): Partial<Client> {
    const { subsidiaryId, isActive, ...restOfDto } = updateClientDto;
    const updatePayload: Partial<Client> = { ...restOfDto };


    // Only admins can change the isActive status of master records.
    if ('isActive' in updateClientDto) {
      if (loggedInUserRole !== 'Administrator') {
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