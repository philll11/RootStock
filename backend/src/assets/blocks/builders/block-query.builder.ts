// backend/src/assets/blocks/builders/block-query.builder.ts
import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { Types } from 'mongoose';
import { User } from '../../../iam/users/schemas/user.schema';
import { QueryBlockDto } from '../dto/query-block.dto';
import { ClientResolverService } from '../../../iam/client-resolver/client-resolver.service';
// Ensure 'BLOCK' is added to your Resource enum in permissions.constants.ts
import { Resource } from '../../../common/constants/permissions.constants';

export class BlockQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryBlockDto, user: User, clientResolverService: ClientResolverService) {
    super(queryDto, user, clientResolverService, Resource.BLOCK);
  }

  protected buildSearchFilters() {
    // 1. Allow BaseBuilder to handle standard fields (recordId, name, isDeleted, etc.)
    super.buildSearchFilters();

    // 2. Handle Block-specific filters
    // Filtering by varietyId requires looking inside the embedded 'plantings' array
    if (this.queryDto.varietyId) {
      this.filter['plantings.varietyId'] = new Types.ObjectId(this.queryDto.varietyId);
    }
  }

  // OVERRIDE: For Block, the visibility scope is determined by the parent Client.
  // Since we denormalize 'clientId' onto the Block, we filter by that field.
  protected async applyVisibilityScope() {
      await super.applyVisibilityScope('clientId');
  }
}