import { BaseEntity } from '@rootstock/shared/util';

export interface Client extends BaseEntity {
  name: string;
  subsidiaryId?: string;
  isOptimistic?: boolean;
}

export interface CreateClientDto {
  name: string;
  subsidiaryId?: string;
}

export interface UpdateClientDto {
  name?: string;
  isActive?: boolean;
  __v: number;
}

export interface ClientQuery {
  name?: string;
  includeInactives?: boolean;
}
