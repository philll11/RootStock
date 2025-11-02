// frontend/packages/shared/src/types.ts

export interface Client {
  _id: string; // The MongoDB ObjectId
  recordId: string;
  name: string;
  subsidiaryId?: string; // ObjectId will be a string on the frontend
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string; // Timestamps will be ISO date strings
  updatedAt: string;
}