import { ForbiddenException } from '@nestjs/common';
import { User } from '../../users/schemas/user.schema';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';

import { PERMISSIONS } from '../constants/permissions.constants'

export class BaseQueryBuilder {
  protected filter: any = {};
  protected queryDto: any;
  protected user: User;

  protected readonly clientResolverService: ClientResolverService;

  constructor(queryDto: any, user: User, clientResolverService: ClientResolverService) {
    this.queryDto = queryDto;
    this.user = user;
    if (clientResolverService) {
      this.clientResolverService = clientResolverService;
    }
  }

  public async build(): Promise<any> {
    // The order is critical: apply security first, then user-defined filters.
    await this.applyVisibilityScope();
    this.buildStatusFilters();
    this.buildSearchFilters();
    return this.filter;
  }

  protected async applyVisibilityScope(resourceIdField = 'clientId') {
    if (!this.user || !this.user.roleId) {
        throw new ForbiddenException('Invalid user context for query.');
    }
    const scope = (this.user.roleId as any).visibilityScope;

    switch (scope) {
      case VisibilityScope.GLOBAL:
        break;

      case VisibilityScope.CLIENT:
        this.filter[resourceIdField] = { $in: this.user.clientIds };
        break;

      case VisibilityScope.SUBSIDIARY:
        const accessibleClientIds = await this.clientResolverService.getAccessibleClientIdsForSubsidiaryScope(this.user);
        this.filter[resourceIdField] = { $in: accessibleClientIds };
        break;
    }
  }

  protected buildStatusFilters() {
    const userPermissions = (this.user.roleId as any)?.permissions || [];

    if (this.queryDto.isDeleted === true) {
      if (!userPermissions.includes(PERMISSIONS.VIEW_DELETED)) {
        throw new ForbiddenException('You do not have permission to view deleted records.');
      }
      this.filter.isDeleted = true;
      return;
    }

    // Default behavior: filter out deleted records.
    this.filter.isDeleted = false;

    // Default behavior: only include active records.
    this.filter.isActive = true;

    // Allow overriding the isActive filter if the DTO specifies it.
    if (this.queryDto.includeInactives) {
      this.filter.isActive = { $in: [true, false] };
    } else if (this.queryDto.isActive !== undefined) {
      this.filter.isActive = this.queryDto.isActive;
    }
  }

  protected buildSearchFilters() {
    if (this.queryDto.name) {
      this.filter.name = { $regex: this.queryDto.name, $options: 'i' };
    }
    if (this.queryDto.recordId) {
      this.filter.recordId = { $regex: this.queryDto.recordId, $options: 'i' };
    }
  }

}