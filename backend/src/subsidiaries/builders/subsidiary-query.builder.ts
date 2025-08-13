import { Model, Types } from 'mongoose';
import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { QuerySubsidiaryDto } from '../dto/query-subsidiary.dto';
import { User } from '../../users/schemas/user.schema';
import { ClientDocument } from '../../clients/schemas/client.schema';
import { VisibilityScope } from '../../roles/schemas/role.schema';

export class SubsidiaryQueryBuilder extends BaseQueryBuilder {
  constructor(
    queryDto: QuerySubsidiaryDto,
    user: User,
    clientModel: Model<ClientDocument>,
  ) {
    super(queryDto, user, clientModel);
  }

  /**
   * Overrides the base visibility logic for the Subsidiary resource.
   */
  protected async applyVisibilityScope() {
    if (!this.user || !this.user.roleId) {
      throw new Error('User context is required for building a query.');
    }
    const scope = (this.user.roleId as any).visibilityScope;

    switch (scope) {
      case VisibilityScope.GLOBAL:
        break;

      case VisibilityScope.CLIENT:
      case VisibilityScope.SUBSIDIARY:
        // For both Client and Subsidiary scopes, the logic is the same:
        // users can only see the parent subsidiaries of the clients they are assigned to.
        const accessibleSubsidiaryIds = await this.getAccessibleSubsidiaryIds();
        this.filter._id = { $in: accessibleSubsidiaryIds };
        break;
    }
  }

  /**
   * Finds the unique parent subsidiary IDs based on the user's assigned clients.
   * @returns An array of subsidiary ObjectIds.
   */
  private async getAccessibleSubsidiaryIds(): Promise<Types.ObjectId[]> {
    if (!this.user.clientIds || this.user.clientIds.length === 0) {
      return []; // If a user has no assigned clients, they can see no subsidiaries.
    }

    // Find all clients the user is assigned to
    const assignedClients = await this.clientModel
      .find({ _id: { $in: this.user.clientIds } })
      .select('subsidiaryId')
      .exec();

    const definedIds = assignedClients
      .map(client => client.subsidiaryId)
      .filter((id): id is Types.ObjectId => !!id);

    // Get a unique set of their parent subsidiary IDs
    const uniqueIdStrings = new Set(definedIds.map(id => id.toString()));
    return Array.from(uniqueIdStrings).map(str => new Types.ObjectId(str));
  }
}