export interface Planting {
  varietyId: string | { _id: string; name: string };
  treeCount: number;
}

export interface Block {
  _id: string;
  recordId: string;
  name: string;
  orchardId: string | { _id: string; name: string };
  clientId: string;
  plantings: Planting[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBlockDto {
  name: string;
  plantings: {
    varietyId: string;
    treeCount: number;
  }[];
}

export interface UpdateBlockDto {
  name?: string;
  plantings?: {
    varietyId: string;
    treeCount: number;
  }[];
  isActive?: boolean;
}
