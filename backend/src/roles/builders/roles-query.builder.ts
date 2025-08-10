import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BaseQueryBuilder } from '../../common/builders/base-query.builder';
import { QueryRoleDto } from '../dto/query-role.dto';
import { User } from '../../users/schemas/user.schema';
import { VisibilityScope } from '../schemas/role.schema';

export class RoleQueryBuilder extends BaseQueryBuilder {
  constructor(queryDto: QueryRoleDto, user: User) {
    super(queryDto, user);
  }

  /**
   * Overrides the base visibility logic to enforce Administrator-only access to roles.
   */
  protected async applyVisibilityScope() {
    if (!this.user || !this.user.roleId) {
      throw new ForbiddenException('A valid user context is required to query roles.');
    }
    const scope = (this.user.roleId as any).visibilityScope;

    // Only Admins can access Roles
    if (scope !== VisibilityScope.GLOBAL) {
      // This creates a query that will never match any documents.
      this.filter._id = new Types.ObjectId('000000000000000000000000');
    }
  }

  public async build(): Promise<any> {
    await this.applyVisibilityScope();
    this.buildStatusFilters();
    this.buildSearchFilters();
    return this.filter;
  }
}