import { BaseEntity } from 'types/models';

export interface Variety extends BaseEntity {
  name: string;
}

export interface CreateVarietyDto {
  _id?: string;
  name: string;
}

export interface UpdateVarietyDto {
  name?: string;
  isActive?: boolean;
  __v: number;
}

export interface VarietyQuery {
  name?: string;
  isDeleted?: boolean;
  includeInactives?: boolean;
}
