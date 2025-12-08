export interface Orchard {
  _id: string;
  recordId: string;
  name: string;
  clientId: string | { _id: string; name: string; recordId: string };
  userIds: string[] | { _id: string; name: string; recordId: string }[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrchardDto {
  name: string;
  clientId: string;
  userIds?: string[];
}

export interface UpdateOrchardDto {
  name?: string;
  userIds?: string[];
  isActive?: boolean;
}

export interface OrchardQuery {
  name?: string;
  includeInactives?: boolean;
}
