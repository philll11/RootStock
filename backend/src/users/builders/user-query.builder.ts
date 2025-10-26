// backend/src/users/builders/user-query.builder.ts

import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { QueryUserDto } from '../dto/query-user.dto';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';
import { Resource } from '../../common/constants/permissions.constants';

export class UserQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryUserDto, user: User, clientResolverService: ClientResolverService) {
    super(queryDto, user, clientResolverService, Resource.USER);
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