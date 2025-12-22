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
   * Grants the ability to change a user's `isActive` status and to include
   * inactive user records in query results. This is a sensitive operation
   * separate from a standard edit.
   */
  USER_MANAGE_INACTIVE: 'User:ManageInactive',

  // --- Client Management ---
  // Permissions for managing direct customer entities (Clients).
  CLIENT_CREATE: 'Client:Create',
  CLIENT_VIEW: 'Client:View',
  CLIENT_EDIT: 'Client:Edit',
  CLIENT_DELETE: 'Client:Delete',
  /**
   * Grants the ability to change a client's `isActive` status and to
   * include inactive client records in query results.
   */
  CLIENT_MANAGE_INACTIVE: 'Client:ManageInactive',

  // --- Orchard Management ---
  // Permissions for managing orchard entities.
  ORCHARD_CREATE: 'Orchard:Create',
  ORCHARD_VIEW: 'Orchard:View',
  ORCHARD_EDIT: 'Orchard:Edit',
  ORCHARD_DELETE: 'Orchard:Delete',
  /**
   * Grants the ability to change an orchard's `isActive` status and to
   * include inactive orchard records in query results.
   */
  ORCHARD_MANAGE_INACTIVE: 'Orchard:ManageInactive',

  // --- Block Management ---
  // Permissions for managing block entities (child of Orchard).
  BLOCK_CREATE: 'Block:Create',
  BLOCK_VIEW: 'Block:View',
  BLOCK_EDIT: 'Block:Edit',
  BLOCK_DELETE: 'Block:Delete',
  /**
   * Grants the ability to change a block's `isActive` status and to
   * include inactive block records in query results.
   */
  BLOCK_MANAGE_INACTIVE: 'Block:ManageInactive',

  // --- Assessment Management ---
  // Permissions for managing assessment entities.
  ASSESSMENT_CREATE: 'Assessment:Create',
  ASSESSMENT_VIEW: 'Assessment:View',
  ASSESSMENT_EDIT: 'Assessment:Edit',
  ASSESSMENT_DELETE: 'Assessment:Delete',

  /**
   * Grants the ability to change an assessment's `isActive` status and to
   * include inactive assessment records in query results.
   */
  ASSESSMENT_MANAGE_INACTIVE: 'Assessment:ManageInactive',

  // --- Role Management ---
  // Permissions for managing user roles and their associated permissions.
  // These are typically restricted to top-level administrators.
  ROLE_CREATE: 'Role:Create',
  ROLE_VIEW: 'Role:View',
  ROLE_EDIT: 'Role:Edit',
  ROLE_DELETE: 'Role:Delete',
  /**
   * Grants the ability to change a role's `isActive` status and to
   * include inactive role records in query results.
   */
  ROLE_MANAGE_INACTIVE: 'Role:ManageInactive',

  // --- Subsidiary Management ---
  // Permissions for managing the highest-level business entities (Subsidiaries).
  SUBSIDIARY_CREATE: 'Subsidiary:Create',
  SUBSIDIARY_VIEW: 'Subsidiary:View',
  SUBSIDIARY_EDIT: 'Subsidiary:Edit',
  SUBSIDIARY_DELETE: 'Subsidiary:Delete',
  /**
   * Grants the ability to change a subsidiary's `isActive` status and to
   * include inactive subsidiary records in query results.
   */
  SUBSIDIARY_MANAGE_INACTIVE: 'Subsidiary:ManageInactive',

  // --- Variety Management (Master Data) ---
  // Permissions for managing fruit varieties.
  VARIETY_CREATE: 'Variety:Create',
  VARIETY_VIEW: 'Variety:View',
  VARIETY_EDIT: 'Variety:Edit',
  VARIETY_DELETE: 'Variety:Delete',
  /**
   * Grants the ability to change a variety's `isActive` status and to
   * include inactive variety records in query results.
   */
  VARIETY_MANAGE_INACTIVE: 'Variety:ManageInactive',

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

/**
 * An enum that defines the standardized resource names used in permission strings.
 * This provides a single, type-safe source of truth for resource identifiers,
 * preventing the use of brittle, hardcoded strings throughout the application.
 */
export enum Resource {
  USER = 'User',
  CLIENT = 'Client',
  ORCHARD = 'Orchard',
  BLOCK = 'Block',
  ASSESSMENT = 'Assessment',
  ROLE = 'Role',
  SUBSIDIARY = 'Subsidiary',
  COUNTERS = 'Counters',
  VARIETY = 'Variety',
}