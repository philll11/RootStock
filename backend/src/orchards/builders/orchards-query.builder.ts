import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { QueryOrchardDto } from '../dto/query-orchard.dto';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';

export class OrchardQueryBuilder extends BaseQueryBuilder {
  constructor( queryDto: QueryOrchardDto, user: User, clientResolverService: ClientResolverService ) {
    super(queryDto, user, clientResolverService);
  }

  protected buildSearchFilters() {
    super.buildSearchFilters();

    if (this.queryDto.clientId) {
      this.filter.clientId = new Types.ObjectId(this.queryDto.clientId);
    }
  }

  // OVERRIDE: For a child resource like Orchard, the visibility scope filter
  // must be applied to its parent's ID field, which is 'clientId'.
  protected async applyVisibilityScope() {
      await super.applyVisibilityScope('clientId');
  }
}