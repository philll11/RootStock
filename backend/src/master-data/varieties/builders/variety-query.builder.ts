import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { VarietyQueryDto } from '../dto/variety-query.dto';
import { User } from '../../../users/schemas/user.schema';
import { ClientResolverService } from '../../../clients/client-resolver/client-resolver.service';
import { Resource } from '../../../common/constants/permissions.constants';

export class VarietyQueryBuilder extends BaseQueryBuilder {
  constructor(
    queryDto: VarietyQueryDto,
    user: User,
    clientResolverService: ClientResolverService,
  ) {
    super(queryDto, user, clientResolverService, Resource.VARIETY);
  }

  protected buildSearchFilters(): void {
    const dto = this.queryDto as VarietyQueryDto;

    if (dto.name) {
      this.filter.name = { $regex: dto.name, $options: 'i' };
    }
  }
}
