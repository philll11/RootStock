export interface BaseEntity {
  _id: string;
  recordId: string;
  __v: number; // Version key for OCC
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}
