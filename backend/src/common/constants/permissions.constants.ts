/**
 * A centralized object that defines all permission strings used throughout the application.
 * Following a 'Resource:Action' convention (e.g., 'User:Create') makes permissions
 * easy to manage, read, and assign.
 *
 * This object is the single source of truth for authorization checks. The PermissionsGuard
 * reads metadata tagged with these constants to determine if a user can access an endpoint.
 * It is also the master list used in the UI for assigning permissions to Roles.
 */
export const PERMISSIONS = {
  // --- User Management ---
  // Permissions related to creating, viewing, and managing user accounts.
  USER_CREATE: 'User:Create',
  USER_VIEW: 'User:View',
  USER_EDIT: 'User:Edit',
  USER_DELETE: 'User:Delete',
  /**
   * Grants the ability to change a user's `isActive` status. This is considered
   * a sensitive operation separate from a standard edit.
   */
  USER_EDIT_STATUS: 'User:EditStatus',

  // --- Client Management ---
  // Permissions for managing direct customer entities (Clients).
  CLIENT_CREATE: 'Client:Create',
  CLIENT_VIEW: 'Client:View',
  CLIENT_EDIT: 'Client:Edit',
  CLIENT_DELETE: 'Client:Delete',
  /**
   * Grants the ability to change a client's `isActive` status.
   */
  CLIENT_EDIT_STATUS: 'Client:EditStatus',

  // --- Orchard Management ---
  // Permissions for managing orchard entities.
  ORCHARD_CREATE: 'Orchard:Create',
  ORCHARD_VIEW: 'Orchard:View',
  ORCHARD_EDIT: 'Orchard:Edit',
  ORCHARD_DELETE: 'Orchard:Delete',
  /**
   * Grants the ability to change a client's `isActive` status.
   */
  ORCHARD_EDIT_STATUS: 'Orchard:EditStatus',

  // --- Role Management ---
  // Permissions for managing user roles and their associated permissions.
  // These are typically restricted to top-level administrators.
  ROLE_CREATE: 'Role:Create',
  ROLE_VIEW: 'Role:View',
  ROLE_EDIT: 'Role:Edit',
  ROLE_DELETE: 'Role:Delete',

  // --- Subsidiary Management ---
  // Permissions for managing the highest-level business entities (Subsidiaries).
  SUBSIDIARY_CREATE: 'Subsidiary:Create',
  SUBSIDIARY_VIEW: 'Subsidiary:View',
  SUBSIDIARY_EDIT: 'Subsidiary:Edit',
  SUBSIDIARY_DELETE: 'Subsidiary:Delete',
  /**
   * Grants the ability to change a subsidiary's `isActive` status.
   */
  SUBSIDIARY_EDIT_STATUS: 'Subsidiary:EditStatus',

  // --- System Configuration ---
  // Permissions for managing system-level configurations, like recordId counters.
  COUNTERS_VIEW: 'Counters:View',
  COUNTERS_EDIT: 'Counters:Edit',

  // --- Global & System-Wide Permissions ---
  // Special permissions that are not tied to a single resource's CRUD operations.
  /**
   * Grants the ability to query for records that have been soft-deleted
   * by using the `?isDeleted=true` query parameter. This is a powerful
   * permission intended only for administrators for data recovery or auditing.
   */
  VIEW_DELETED: 'Global:ViewDeleted',
};