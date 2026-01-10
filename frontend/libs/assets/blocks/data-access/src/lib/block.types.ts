import { BaseEntity } from '@rootstock/shared/util';

export interface Planting {
  _id?: string; // Stable ID for audits
  varietyId: string | { _id: string; name: string; recordId: string };
  treeCount: number;
}

export interface Block extends BaseEntity {
  name: string;
  orchardId: string | { _id: string; name: string; recordId: string };
  clientId: string;
  plantings: Planting[];
}

export interface CreateBlockDto {
  name: string;
  orchardId: string;
  plantings: {
    varietyId: string;
    treeCount: number;
  }[];
}

export interface UpdateBlockDto {
  name?: string;
  plantings?: {
    _id?: string;
    varietyId: string;
    treeCount: number;
  }[];
  isActive?: boolean;
  __v: number;
}


export interface BlockQuery {
  name?: string;
  includeInactives?: boolean;
}