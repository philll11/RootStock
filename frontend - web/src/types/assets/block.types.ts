import { BaseEntity } from 'types/models';

export interface Planting {
  _id?: string; // Stable ID for audits
  varietyId: { _id: string; name: string; recordId: string };
  treeCount: number;
}

export interface Block extends BaseEntity {
  name: string;
  orchardId: { _id: string; name: string; recordId: string };
  clientId: { _id: string; name: string; recordId: string };
  plantings: Planting[];
}

export interface CreateBlockDto {
  _id?: string;
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
  orchardId?: string;
}