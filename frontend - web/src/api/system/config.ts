// Types
import { BaseEntity } from 'types/models';
import axios from 'utils/axios';

export interface SystemConfig<T = any> extends BaseEntity {
  key: string;
  value: T;
  description?: string;
}

export interface UpdateSystemConfigDto {
  value: any;
}

export interface AuditConfig {
  enabled: boolean;
}

// API Functions
export const getSystemConfig = async <T>(key: string): Promise<SystemConfig<T>> => {
  const response = await axios.get<SystemConfig<T>>(`/system/config/${key}`);
  return response.data;
};

export const updateSystemConfig = async ({ key, data }: { key: string; data: UpdateSystemConfigDto }): Promise<void> => {
  await axios.patch(`/system/config/${key}`, data);
};
