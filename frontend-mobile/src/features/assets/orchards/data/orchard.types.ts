import { BaseEntity } from '@/utils';

export interface Orchard extends BaseEntity {
  name: string;
  clientId: string | { _id: string; name: string; recordId: string };
  userIds: string[] | { _id: string; name: string; recordId: string }[];
}

export interface CreateOrchardDto {
  _id?: string;
  name: string;
  clientId: string;
  userIds?: string[];
}

export interface UpdateOrchardDto {
  name?: string;
  userIds?: string[];
  isActive?: boolean;
  __v: number;
}

export interface OrchardQuery {
  name?: string;
  includeInactives?: boolean;
}
