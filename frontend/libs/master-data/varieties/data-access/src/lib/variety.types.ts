export interface Variety {
  _id: string;
  recordId: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVarietyDto {
  name: string;
}

export interface UpdateVarietyDto {
  name?: string;
  isActive?: boolean;
}

export interface VarietyQuery {
  name?: string;
  isDeleted?: boolean;
  includeInactives?: boolean;
}
