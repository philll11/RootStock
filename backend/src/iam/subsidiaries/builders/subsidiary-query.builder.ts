import { Model, Types } from 'mongoose';
import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { QuerySubsidiaryDto } from '../dto/query-subsidiary.dto';
import { User } from '../../users/schemas/user.schema';
import { ClientResolverService } from '../../client-resolver/client-resolver.service';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { Resource } from '../../../common/constants/permissions.constants';

export class SubsidiaryQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QuerySubsidiaryDto, user: User, clientResolverService: ClientResolverService) {
    super(queryDto, user, clientResolverService, Resource.SUBSIDIARY);
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
        const accessibleSubsidiaryIds = await this.clientResolverService.getAccessibleSubsidiaryIdsForUser(this.user);
        this.filter._id = { $in: accessibleSubsidiaryIds };
        break;
    }
  }
}