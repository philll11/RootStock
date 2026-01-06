export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface AuditEntry {
  _id: string;
  resource: string;
  resourceId: string;
  action: AuditAction;
  changes: AuditChange[];
  userId: AuditUser | string; // Populated or ID
  reason?: string;
  date: string; // ISO Date string
  metadata?: any;
}
