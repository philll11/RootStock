import { BaseEntity } from '@rootstock/shared/util';

export enum UserType {
  Employee = 'employee',
  Contact = 'contact',
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  visibilityScope: string;
}

export interface User extends BaseEntity {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  userType: UserType;
  roleId?: string | Role;
  clientIds?: string[];
  preferences?: UserPreferences;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  userType: UserType;
  roleId?: string;
  clientIds?: string[];
  preferences?: UserPreferences;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  __v?: number;
  roleId?: string;
  clientIds?: string[];
  isActive?: boolean;
  preferences?: UserPreferences;
}
