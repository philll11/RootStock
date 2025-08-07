import { ForbiddenException } from '@nestjs/common';

export class BaseQueryBuilder {
  protected filter: any = {};
  protected query: any;
  protected userRole: string;

  constructor(query: any, userRole: string) {
    this.query = query;
    this.userRole = userRole;
  }

  build(): any {
    this._buildStatusFilters();
    this._buildSearchFilters();
    return this.filter;
  }

  /**
   * Handles the complex business logic for status fields like isDeleted and isActive.
   * This is where the core authorization and state logic lives.
   * @protected
   */
  protected _buildStatusFilters() {
    // "Recycle Bin" logic: if isDeleted=true, we only return deleted records.
    if (this.query.isDeleted === true) {
      if (this.userRole !== 'Administrator') {
        throw new ForbiddenException('You do not have permission to view deleted records.');
      }
      this.filter.isDeleted = true;
      return;
    }

    // Returning non-deleted records is the default behavior system-wide
    this.filter.isDeleted = false;

    // Returning active records is the default behavior system-wide
    this.filter.isActive = true;
    if (this.query.includeInactives) { // includeInactives is a special case
      this.filter.isActive = { $in: [true, false] };
    } else if (this.query.isActive !== undefined) {
      this.filter.isActive = this.query.isActive;
    }
  }

  /**
   * Handles standard, simple search filters.
   * @protected
   */
  protected _buildSearchFilters() {
    if (this.query.name) {
      this.filter.name = { $regex: this.query.name, $options: 'i' };
    }
    if (this.query.recordId) {
      this.filter.recordId = { $regex: this.query.recordId, $options: 'i' };
    }
  }
}