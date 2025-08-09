import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { QuerySubsidiaryDto } from '../dto/query-subsidiary.dto';

export class SubsidiaryQueryBuilder extends BaseQueryBuilder {
  constructor(query: QuerySubsidiaryDto, userRole: string) {
    super(query, userRole);
  }
}