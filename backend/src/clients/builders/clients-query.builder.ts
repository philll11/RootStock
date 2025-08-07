import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { Types } from 'mongoose';

export class ClientQueryBuilder extends BaseQueryBuilder {
  constructor(query: any, userRole: string) {
    super(query, userRole);
  }

  protected _buildSearchFilters() {
    super._buildSearchFilters();

    if (this.query.subsidiaryId) {
      this.filter.subsidiaryId = new Types.ObjectId(this.query.subsidiaryId);
    }

  }
}