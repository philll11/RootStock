import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { User } from '../../users/schemas/user.schema';
import { Client, ClientDocument } from '../schemas/client.schema';

@Injectable()
export class ClientResolverService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) { }

  /**
   * Resolves all accessible client IDs for a user based on their role's visibility scope.
   * This is the master method for all security scope resolution.
   * @param user The user for whom to resolve the scope. Must have roleId populated.
   * @returns A promise that resolves to a Set of accessible client ID strings.
   * For GLOBAL scope, it returns a special Set containing 'GLOBAL_ACCESS'.
   */
  async resolveClientIdsForUser(user: User): Promise<Set<string>> {
    // A user object without a populated role cannot have its scope resolved.
    if (!user || !user.roleId || typeof user.roleId !== 'object') {
      throw new ForbiddenException('Invalid user context for scope resolution.');
    }

    const scope = (user.roleId as any).visibilityScope;

    switch (scope) {
      case VisibilityScope.GLOBAL:
        // Return a special flag indicating universal access. This prevents the
        // catastrophic performance issue of fetching all client IDs from the database.
        return new Set(['GLOBAL_ACCESS']);

      case VisibilityScope.CLIENT:
        const clientIds = user.clientIds || [];
        return new Set(clientIds.map(id => id.toString()));

      case VisibilityScope.SUBSIDIARY:
        const accessibleIds = await this.getAccessibleClientIdsForSubsidiaryScope(user);
        return new Set(accessibleIds.map(id => id.toString()));

      default:
        return new Set(); // No access
    }
  }

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
    const assignedClients = await this.clientModel.find({
      _id: { $in: user.clientIds },
    }).select('subsidiaryId').exec();
    if (!assignedClients || assignedClients.length === 0) return [];

    // Step 2: Get a unique list of all parent subsidiary IDs from those clients.
    // Filter out any null/undefined subsidiaryIds.
    const subsidiaryIds = [...new Set(assignedClients.map(c => c.subsidiaryId).filter(Boolean))];
    if (subsidiaryIds.length === 0) return [];

    // Step 3: Find all clients that belong to any of those subsidiaries.
    const accessibleClients = await this.clientModel.find({
      subsidiaryId: { $in: subsidiaryIds },
    }).select('_id').exec();

    // Step 4: Return just the array of their IDs.
    return (accessibleClients || []).map(c => c._id);
  }

  /**
   * Resolves the list of unique parent subsidiary IDs based on the user's assigned clients.
   * @param user - The user for whom to resolve the scope.
   * @returns A promise that resolves to an array of accessible subsidiary ObjectIds.
   */
  async getAccessibleSubsidiaryIdsForUser(user: User): Promise<Types.ObjectId[]> {
    if (!user.clientIds || user.clientIds.length === 0) return [];

    const assignedClients = await this.clientModel
      .find({ _id: { $in: user.clientIds } })
      .select('subsidiaryId')
      .exec();

    const subsidiaryIds = assignedClients
      .map(client => client.subsidiaryId)
      .filter((id): id is Types.ObjectId => !!id);

    const uniqueIdStrings = new Set(subsidiaryIds.map(id => id.toString()));
    return Array.from(uniqueIdStrings).map(str => new Types.ObjectId(str));
  }
}