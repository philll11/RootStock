export interface Client {
  _id: string;
  recordId: string;
  name: string;
  subsidiaryId?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClientDto {
  name: string;
  subsidiaryId?: string;
}

export interface UpdateClientDto {
  name?: string;
  isActive?: boolean;
}

export interface ClientQuery {
  name?: string;
  includeInactives?: boolean;
}
