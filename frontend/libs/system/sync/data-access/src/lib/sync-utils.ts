// frontend/libs/system/sync/data-access/src/lib/sync-utils.ts
import { QueryClient } from '@tanstack/react-query';

/**
 * Patches pending/paused mutations in the queue when a dependency's ID changes.
 * This is critical for offline sequences:
 * 1. Create Parent (Temporary ID: TEMP_1) -> Queued
 * 2. Create Child (references parentId: TEMP_1) -> Queued
 * 3. Parent Syncs -> Success -> Real ID: REAL_100
 * 4. This function finds Child in queue and updates parentId: TEMP_1 -> REAL_100
 * 
 * @param queryClient The QueryClient instance
 * @param field The field name in the dependent mutation variables (e.g., 'clientId', 'orchardId')
 * @param tempId The temporary ID used in the optimistic update
 * @param realId The real ID returned from the server
 */
// Helper to recursively patch IDs in nested objects/arrays
function deepPatch(obj: any, field: string, tempId: string, realId: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  let patched = false;

  // 1. Check current object for the field match
  if (obj[field] === tempId) {
    obj[field] = realId;
    patched = true;
  }

  // 2. Traversal
  if (Array.isArray(obj)) {
    // Array: recurse into each item
    for (const item of obj) {
      if (deepPatch(item, field, tempId, realId)) {
        patched = true;
      }
    }
  } else {
    // Object: recurse into values
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
         // Avoid infinite cycles if any (though typical JSON payloads are trees)
         if (typeof obj[key] === 'object') {
           if (deepPatch(obj[key], field, tempId, realId)) {
             patched = true;
           }
         }
      }
    }
  }
  return patched;
}

export function patchDependencyId(
  queryClient: QueryClient,
  field: string,
  tempId: string,
  realId: string
) {
  if (!tempId || !realId || tempId === realId) return;

  const mutationCache = queryClient.getMutationCache();
  const allMutations = mutationCache.getAll();
  
  allMutations.forEach((mutation) => {
    // We only care about mutations waiting to run (paused) or currently in limbo (pending)
    // Note: 'pending' might mean currently running, but if it hasn't sent the request yet or is retrying,
    // patching variables might help. Primarily targets 'paused' (offline).
    if (mutation.state.isPaused || mutation.state.status === 'pending') {
      const variables = mutation.state.variables as any;
      
      // DEEP PATCH: Recursively search and replace
      const wasPatched = deepPatch(variables, field, tempId, realId);

      if (wasPatched) {
        // CRITICAL: Ensure state update propagates
        if ((mutation as any).setState) {
             (mutation as any).setState((prev: any) => ({
                 ...prev,
                 variables: variables 
             }));
        } else {
             mutation.state.variables = variables;
        }
      }
    }
  });
}
