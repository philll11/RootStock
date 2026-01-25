import { BaseEntity } from 'types/models';

export interface Orchard extends BaseEntity {
    name: string;
    clientId: string | { _id: string; name: string; recordId: string };
    userIds: string[] | { _id: string; name: string; recordId: string; firstName: string; lastName: string }[];
}

export interface CreateOrchardDto {
    name: string;
    clientId: string;
    userIds?: string[];
}

export interface UpdateOrchardDto {
    name?: string;
    isActive?: boolean;
    userIds?: string[];
    __v: number;
}

export interface OrchardQuery {
    name?: string;
    includeInactives?: boolean;
    clientId?: string;
}
