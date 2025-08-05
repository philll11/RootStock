import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client, ClientDocument } from './entities/client.schema';

@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private clientModel: Model<ClientDocument>) { }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  async findAll(): Promise<Client[]> {
    return this.clientModel.find().exec();
  }

  async findOne(clientId: string): Promise<Client> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
    return client;
  }

  async update(clientId: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const updatedClient = await this.clientModel.findByIdAndUpdate(
      clientId,
      updateClientDto,
      { new: true }
    ).exec();
    if (!updatedClient) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
    return updatedClient;
  }

  async remove(clientId: string): Promise<{ deleted: boolean, _id: string }> {
    const result = await this.clientModel.findByIdAndDelete(clientId).exec();
    if (!result) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
    return { deleted: true, _id: clientId };
  }
}