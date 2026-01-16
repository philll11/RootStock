import { BaseEntity, VisibilityScope } from '@rootstock/shared/util';

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  visibilityScope: VisibilityScope;
  permissions: string[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  visibilityScope: VisibilityScope;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  visibilityScope?: VisibilityScope;
  permissions?: string[];
  isActive?: boolean;
  __v?: number; // Required for OCC
}
