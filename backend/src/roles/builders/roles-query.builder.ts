import { BaseQueryBuilder } from '../../common/builders/base-query.builder';

export class RoleQueryBuilder extends BaseQueryBuilder {
  constructor(query: any, userRole: string) {
    super(query, userRole);
  }

  protected _buildSearchFilters() {
    super._buildSearchFilters();
  }
}