import { BaseEntity } from 'types/models';

export enum UserType {
  Employee = 'employee',
  Contact = 'contact',
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
}

export interface User extends BaseEntity {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  userType: UserType;
  roleId?: string | { _id: string; name: string; recordId: string; permissions: string[]; visibilityScope: string };
  clientIds?: string[] | { _id: string; name: string; recordId: string }[];
  preferences?: UserPreferences;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  userType: UserType;
  roleId?: string | { _id: string; name: string; recordId: string; permissions: string[]; visibilityScope: string };
  clientIds?: string[] | { _id: string; name: string; recordId: string }[];
  preferences?: UserPreferences;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  __v?: number;
  roleId?: string | { _id: string; name: string; recordId: string; permissions: string[]; visibilityScope: string };
  clientIds?: string[] | { _id: string; name: string; recordId: string }[];
  isActive?: boolean;
  preferences?: UserPreferences;
}
