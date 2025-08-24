import { ForbiddenException } from '@nestjs/common';
import { User } from '../../users/schemas/user.schema';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';

import { PERMISSIONS, Resource } from '../constants/permissions.constants'

export class BaseQueryBuilder {
  protected filter: any = {};
  protected queryDto: any;
  protected user: User;
  protected resourceName: Resource;

  protected readonly clientResolverService: ClientResolverService;

  constructor(queryDto: any, user: User, clientResolverService: ClientResolverService, resourceName: Resource) {
    this.queryDto = queryDto;
    this.user = user;
    this.clientResolverService = clientResolverService;
    this.resourceName = resourceName;
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

    // Default behavior: only include active records unless user has specific permission.
    const canManageInactive = userPermissions.includes(`${this.resourceName}:ManageInactive`);

    if (this.queryDto.includeInactives === true && canManageInactive) {
      // If the user requests inactive records and has permission, remove the isActive filter.
      // This will return both active and inactive records.
      delete this.filter.isActive;
    } else {
      // Otherwise, default to only showing active records.
      this.filter.isActive = true;
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