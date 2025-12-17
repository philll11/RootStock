import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { QueryClientDto } from '../dto/query-client.dto';
import { ClientResolverService } from '../../client-resolver/client-resolver.service';
import { Resource } from '../../../common/constants/permissions.constants';


export class ClientQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryClientDto, user: User, clientResolverService: ClientResolverService) {
    super(queryDto, user, clientResolverService, Resource.CLIENT);
  }

  protected buildSearchFilters() {
    super.buildSearchFilters();

    if (this.queryDto.subsidiaryId) {
      this.filter.subsidiaryId = new Types.ObjectId(this.queryDto.subsidiaryId);
    }
  }

  // OVERRIDE: When querying for Clients themselves, the visibility scope filter
  // should apply to the client's own '_id' field.
  protected async applyVisibilityScope() {
      await super.applyVisibilityScope('_id');
  }
}