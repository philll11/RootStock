import { BaseQueryBuilder } from '../../common/builders/base-query.builder';

export class UserQueryBuilder extends BaseQueryBuilder {
  constructor(query: any, userRole: string) {
    super(query, userRole);
  }

  protected _buildSearchFilters() {
    super._buildSearchFilters();

    if (this.query.userType) {
      this.filter.userType = this.query.userType;
    }
    
  }
}