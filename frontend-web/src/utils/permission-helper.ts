import { PERMISSIONS } from 'constants/permissions';

// Define standard actions
export type PermissionAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'ManageInactive' | 'Other';

// Define the matrix structure
// Record<ResourceName, Record<ActionName, boolean>>
export type PermissionMatrixState = Record<string, Record<string, boolean>>;

/**
 * Extracts the Resource and Action from a permission string.
 * Format: "Resource:Action"
 */
export const parsePermission = (permission: string): { resource: string; action: string } => {
  const [resource, action] = permission.split(':');
  return { resource, action: action || 'Unknown' };
};

/**
 * Generates the full list of available permissions grouped by Resource.
 * Uses the PERMISSIONS constant as the source of truth.
 */
export const getGroupedPermissions = () => {
  const groups: Record<string, string[]> = {};
  
  Object.values(PERMISSIONS).forEach((perm) => {
    const { resource } = parsePermission(perm);
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(perm);
  });

  return groups;
};

/**
 * Converts a flat array of permission strings into a structured matrix for the UI.
 * @param assignedPermissions Array of permission strings (e.g., ['User:View', 'User:Create'])
 */
export const permissionsToMatrix = (assignedPermissions: string[] = []): PermissionMatrixState => {
  const matrix: PermissionMatrixState = {};
  const allPermissions = getGroupedPermissions();

  Object.keys(allPermissions).forEach((resource) => {
    matrix[resource] = {};
    const resourcePerms = allPermissions[resource];
    
    resourcePerms.forEach((permString) => {
      const { action } = parsePermission(permString);
      matrix[resource][action] = assignedPermissions.includes(permString);
    });
  });

  return matrix;
};

/**
 * Converts the UI matrix back into a flat array of permission strings.
 * @param matrix The structured matrix state
 */
export const matrixToPermissions = (matrix: PermissionMatrixState): string[] => {
  const permissions: string[] = [];

  Object.entries(matrix).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, isSelected]) => {
      if (isSelected) {
        permissions.push(`${resource}:${action}`);
      }
    });
  });

  return permissions;
};

/**
 * Helper to check if all permissions for a resource are selected
 */
export const isResourceAllSelected = (matrix: PermissionMatrixState, resource: string): boolean => {
  const actions = matrix[resource];
  if (!actions) return false;
  return Object.values(actions).every((val) => val === true);
};

/**
 * Helper to toggle all permissions for a resource
 */
export const toggleResourceAll = (
  matrix: PermissionMatrixState, 
  resource: string, 
  value: boolean
): PermissionMatrixState => {
  const newMatrix = { ...matrix };
  const actions = newMatrix[resource];
  
  if (actions) {
    Object.keys(actions).forEach((action) => {
      actions[action] = value;
    });
  }
  
  return newMatrix;
};
