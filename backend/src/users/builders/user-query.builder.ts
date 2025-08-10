import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { ClientDocument } from '../../clients/schemas/client.schema';
import { QueryUserDto } from '../dto/query-user.dto';

export class UserQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryUserDto, user: User, clientModel: Model<ClientDocument>) {
    super(queryDto, user, clientModel);
  }

  // OVERRIDE: When querying for Users, the visibility scope filter
  // should apply to the user's `clientIds` field.
  protected async applyVisibilityScope() {
      await super.applyVisibilityScope('clientIds');
  }

  protected buildSearchFilters() {
    super.buildSearchFilters();
    if (this.queryDto.userType) {
      this.filter.userType = this.queryDto.userType;
    }
  }
}