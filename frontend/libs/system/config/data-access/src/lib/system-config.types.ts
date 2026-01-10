export interface SystemConfig<T = any> {
  _id: string;
  key: string;
  value: T;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSystemConfigDto {
  value: any;
}
