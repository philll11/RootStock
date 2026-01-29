// Global Base Entity Interface
export interface BaseEntity {
    _id: string;
    recordId: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
}
