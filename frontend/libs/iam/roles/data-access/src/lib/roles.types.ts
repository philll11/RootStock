export enum VisibilityScope {
  Global = 'Global',
  Subsidiary = 'Subsidiary',
  Client = 'Client',
}

export interface Role {
  _id: string;
  recordId: string;
  name: string;
  description?: string;
  visibilityScope: VisibilityScope;
  permissions: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v: number; // Required for OCC
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
  __v: number; // Required for OCC
}
