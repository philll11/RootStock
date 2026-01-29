import { BaseEntity } from 'types/models';

// Enums must match Backend
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    REOPEN = 'REOPEN'
}

export interface AuditChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export interface AuditUserStub {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface AuditEntry extends BaseEntity {
    resource: string;
    resourceId: string;
    action: AuditAction;
    changes: AuditChange[];
    userId: AuditUserStub | string; // Populated or ID
    reason: string;
    metadata?: any;
    date: string; // ISO String
}