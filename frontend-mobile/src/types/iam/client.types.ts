import { BaseEntity } from 'types/models';
  
export interface Client extends BaseEntity {
    name: string;
    subsidiaryId?: { _id: string; name: string; recordId: string };
    isOptimistic?: boolean;
}

export interface CreateClientDto {
    _id?: string;
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
