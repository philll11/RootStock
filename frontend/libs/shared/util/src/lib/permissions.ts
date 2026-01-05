export const PERMISSIONS = {
  // --- User Management ---
  USER_CREATE: 'User:Create',
  USER_VIEW: 'User:View',
  USER_EDIT: 'User:Edit',
  USER_DELETE: 'User:Delete',
  USER_MANAGE_INACTIVE: 'User:ManageInactive',

  // --- Client Management ---
  CLIENT_CREATE: 'Client:Create',
  CLIENT_VIEW: 'Client:View',
  CLIENT_EDIT: 'Client:Edit',
  CLIENT_DELETE: 'Client:Delete',
  CLIENT_MANAGE_INACTIVE: 'Client:ManageInactive',

  // --- Orchard Management ---
  ORCHARD_CREATE: 'Orchard:Create',
  ORCHARD_VIEW: 'Orchard:View',
  ORCHARD_EDIT: 'Orchard:Edit',
  ORCHARD_DELETE: 'Orchard:Delete',
  ORCHARD_MANAGE_INACTIVE: 'Orchard:ManageInactive',

  // --- Block Management ---
  BLOCK_CREATE: 'Block:Create',
  BLOCK_VIEW: 'Block:View',
  BLOCK_EDIT: 'Block:Edit',
  BLOCK_DELETE: 'Block:Delete',
  BLOCK_MANAGE_INACTIVE: 'Block:ManageInactive',

  // --- Assessment Management ---
  ASSESSMENT_CREATE: 'Assessment:Create',
  ASSESSMENT_VIEW: 'Assessment:View',
  ASSESSMENT_EDIT: 'Assessment:Edit',
  ASSESSMENT_DELETE: 'Assessment:Delete',
  ASSESSMENT_MANAGE_INACTIVE: 'Assessment:ManageInactive',

  // --- Role Management ---
  ROLE_CREATE: 'Role:Create',
  ROLE_VIEW: 'Role:View',
  ROLE_EDIT: 'Role:Edit',
  ROLE_DELETE: 'Role:Delete',
  ROLE_MANAGE_INACTIVE: 'Role:ManageInactive',

  // --- Subsidiary Management ---
  SUBSIDIARY_CREATE: 'Subsidiary:Create',
  SUBSIDIARY_VIEW: 'Subsidiary:View',
  SUBSIDIARY_EDIT: 'Subsidiary:Edit',
  SUBSIDIARY_DELETE: 'Subsidiary:Delete',
  SUBSIDIARY_MANAGE_INACTIVE: 'Subsidiary:ManageInactive',

  // --- Variety Management (Master Data) ---
  VARIETY_CREATE: 'Variety:Create',
  VARIETY_VIEW: 'Variety:View',
  VARIETY_EDIT: 'Variety:Edit',
  VARIETY_DELETE: 'Variety:Delete',
  VARIETY_MANAGE_INACTIVE: 'Variety:ManageInactive',

  // --- System Configuration ---
  COUNTERS_VIEW: 'Counters:View',
  COUNTERS_EDIT: 'Counters:Edit',
  SYSTEM_CONFIG_VIEW: 'SystemConfig:View',
  SYSTEM_CONFIG_EDIT: 'SystemConfig:Edit',

  // --- Global ---
  VIEW_DELETED: 'Global:ViewDeleted',
};

export enum VisibilityScope {
  CLIENT = 'Client',
  SUBSIDIARY = 'Subsidiary',
  GLOBAL = 'Global',
}

export enum Resource {
  USER = 'User',
  CLIENT = 'Client',
  ORCHARD = 'Orchard',
  ROLE = 'Role',
  SUBSIDIARY = 'Subsidiary',
  COUNTERS = 'Counters',
  SYSTEM_CONFIG = 'SystemConfig',
  VARIETY = 'Variety',
}
