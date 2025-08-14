import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Client, ClientDocument } from '../schemas/client.schema';

@Injectable()
export class ClientResolverService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) { }

  /**
   * Resolves the list of all accessible client IDs for a user with 'Subsidiary' visibility scope.
   * It finds the subsidiaries of the user's directly assigned clients, and then returns
   * all clients belonging to any of those subsidiaries.
   * @param user - The user for whom to resolve the scope.
   * @returns A promise that resolves to an array of accessible client ObjectIds.
   */
  async getAccessibleClientIdsForSubsidiaryScope(user: User): Promise<Types.ObjectId[]> {
    if (!user.clientIds || user.clientIds.length === 0) return [];

    // Step 1: Find the full client documents the user is directly assigned to.
    const assignedClients = await this.clientModel.find({ _id: { $in: user.clientIds } }).select('subsidiaryId').exec();
    if (!assignedClients || assignedClients.length === 0) return [];

    // Step 2: Get a unique list of all parent subsidiary IDs from those clients.
    const subsidiaryIds = [...new Set(assignedClients.map(c => c.subsidiaryId))];

    // Step 3: Find all clients that belong to any of those subsidiaries.
    const accessibleClients = await this.clientModel.find({ subsidiaryId: { $in: subsidiaryIds } }).select('_id').exec();

    // Step 4: Return just the array of their IDs.
    return (accessibleClients || []).map(c => c._id);
  }

    /**
   * Resolves the list of unique parent subsidiary IDs based on the user's assigned clients.
   * @param user - The user for whom to resolve the scope.
   * @returns A promise that resolves to an array of accessible subsidiary ObjectIds.
   */
  async getAccessibleSubsidiaryIdsForUser(user: User): Promise<Types.ObjectId[]> {
    if (!user.clientIds || user.clientIds.length === 0) return []; // A user with no clients can see no subsidiaries.

    const assignedClients = await this.clientModel
      .find({ _id: { $in: user.clientIds } })
      .select('subsidiaryId')
      .exec();

    // Filter out any clients that may not have a subsidiaryId
    const subsidiaryIds = assignedClients
      .map(client => client.subsidiaryId)
      .filter((id): id is Types.ObjectId => !!id);

    // Get a unique set of IDs
    const uniqueIdStrings = new Set(subsidiaryIds.map(id => id.toString()));
    return Array.from(uniqueIdStrings).map(str => new Types.ObjectId(str));
  }
}