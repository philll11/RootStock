import { ForbiddenException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Client, ClientDocument } from '../../clients/schemas/client.schema';
import { VisibilityScope } from '../../roles/schemas/role.schema';

export class BaseQueryBuilder {
  protected filter: any = {};
  protected queryDto: any;
  protected user: User;

  protected readonly clientModel: Model<ClientDocument>;

  constructor(queryDto: any, user: User, clientModel?: Model<ClientDocument>) {
    this.queryDto = queryDto;
    this.user = user;
    if (clientModel) {
      this.clientModel = clientModel;
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
        const accessibleClientIds = await this.getAccessibleClientIdsForSubsidiaryScope();
        this.filter[resourceIdField] = { $in: accessibleClientIds };
        break;
    }
  }

  protected buildStatusFilters() {
    const userRoleName = (this.user.roleId as any)?.name;

    if (this.queryDto.isDeleted === true) {
      if (userRoleName !== 'Administrator') {
        throw new ForbiddenException('You do not have permission to view deleted records.');
      }
      this.filter.isDeleted = true;
      return;
    }

    this.filter.isDeleted = false;

    this.filter.isActive = true;
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

  private async getAccessibleClientIdsForSubsidiaryScope(): Promise<Types.ObjectId[]> {
    if (!this.clientModel) {
        throw new Error('ClientModel must be provided to the builder for Subsidiary scope resolution.');
    }
    if (!this.user.clientIds || this.user.clientIds.length === 0) {
      return [];
    }

    const assignedClients = await this.clientModel.find({ _id: { $in: this.user.clientIds } }).select('subsidiaryId').exec();
    const subsidiaryIds = [...new Set(assignedClients.map(c => c.subsidiaryId))];
    const accessibleClients = await this.clientModel.find({ subsidiaryId: { $in: subsidiaryIds } }).select('_id').exec();
    return accessibleClients.map(c => c._id);
  }
}