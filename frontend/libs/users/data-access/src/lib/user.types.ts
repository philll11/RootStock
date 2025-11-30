export enum UserType {
  Employee = 'employee',
  Contact = 'contact',
}

export interface User {
  _id: string;
  recordId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  userType: UserType;
  roleId?: string;
  clientIds?: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  userType: UserType;
  roleId?: string;
  clientIds?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  userType?: UserType;
  roleId?: string;
  clientIds?: string[];
  isActive?: boolean;
}
