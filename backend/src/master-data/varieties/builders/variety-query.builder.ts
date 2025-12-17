import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { VarietyQueryDto } from '../dto/variety-query.dto';
import { User } from '../../../iam/users/schemas/user.schema';
import { ClientResolverService } from '../../../iam/client-resolver/client-resolver.service';
import { Resource } from '../../../common/constants/permissions.constants';

export class VarietyQueryBuilder extends BaseQueryBuilder {
  constructor(
    queryDto: VarietyQueryDto,
    user: User,
    clientResolverService: ClientResolverService,
  ) {
    super(queryDto, user, clientResolverService, Resource.VARIETY);
  }

  /**
   * Override BaseQueryBuilder.applyVisibilityScope
   * Varieties are global master data and are NOT scoped by client or subsidiary.
   * They should be visible to all authenticated users with the correct permission.
   */
  protected async applyVisibilityScope() {
    return;
  }

  protected buildSearchFilters(): void {
    const dto = this.queryDto as VarietyQueryDto;

    if (dto.name) {
      this.filter.name = { $regex: dto.name, $options: 'i' };
    }
  }
}
