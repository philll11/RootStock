import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { ClientDocument } from '../schemas/client.schema';
import { QueryClientDto } from '../dto/query-client.dto';


export class ClientQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryClientDto, user: User, clientModel: Model<ClientDocument>) {
    super(queryDto, user, clientModel);
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