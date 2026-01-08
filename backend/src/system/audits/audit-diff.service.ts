import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditChange } from './schemas/audit.schema';

@Injectable()
export class AuditDiffService {
  /**
   * Computes the difference between two objects and returns a list of changes.
   * 
   * @param oldObj The original object state.
   * @param newObj The new object state.
   * @param prefix Recursion prefix (internal use).
   * @param ignoredPaths List of paths to exclude from the audit log.
   * @param itemIdentityMap "The Which" - Configuration for identifying items within stable arrays.
   *                    Maps a field path (e.g. 'plantings') to a property on the item (e.g. 'varietyId.name')
   *                    to be used as a discriminator suffix (e.g. "Plantings - Envy").
   * @param fieldDisplayNameMap "The What" - Configuration for renaming fields.
   *                    Maps a technical field path (e.g. 'userIds') to a human-readable display name 
   *                    (e.g. 'Assigned Users') used as the prefix.
   */
  computeDiff(
    oldObj: any,
    newObj: any,
    prefix = '',
    ignoredPaths: string[] = [],
    itemIdentityMap: Record<string, string> = {},
    fieldDisplayNameMap: Record<string, string> = {}
  ): AuditChange[] {
    const changes: AuditChange[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    // Fields to ignore
    const systemIgnoredFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password', 'hash'];

    // Helper to map field name
    const getFieldName = (path: string) => fieldDisplayNameMap[path] || path;

    for (const key of allKeys) {
      if (systemIgnoredFields.includes(key)) continue;

      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (ignoredPaths.includes(currentPath)) continue;

      // 1. Handle Arrays
      if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        const arrayChanges = this.diffArray(oldVal || [], newVal || [], currentPath, ignoredPaths, itemIdentityMap, fieldDisplayNameMap);
        changes.push(...arrayChanges);
        continue;
      }

      // 2. Handle Dates
      if (oldVal instanceof Date || newVal instanceof Date) {
        const t1 = oldVal instanceof Date ? oldVal.getTime() : oldVal;
        const t2 = newVal instanceof Date ? newVal.getTime() : newVal;
        if (t1 !== t2) {
          changes.push({ field: getFieldName(currentPath), oldValue: oldVal, newValue: newVal });
        }
        continue;
      }

      // 3. Handle ObjectIds
      if (oldVal instanceof Types.ObjectId || newVal instanceof Types.ObjectId) {
        if (String(oldVal) !== String(newVal)) {
          changes.push({ field: getFieldName(currentPath), oldValue: oldVal, newValue: newVal });
        }
        continue;
      }

      // 4. Handle Reference Objects (Populated Fields)
      // Detect if this is a standard populated reference (contains recordId and name)
      // If so, treat it as a primitive string change rather than recursing into it.
      const oldRef = this.formatReference(oldVal);
      const newRef = this.formatReference(newVal);
      if (oldRef !== null || newRef !== null) {

        const oldDisplay = oldRef !== null ? oldRef : (oldVal ? JSON.stringify(oldVal) : null);
        const newDisplay = newRef !== null ? newRef : (newVal ? JSON.stringify(newVal) : null);

        if (oldDisplay !== newDisplay) {
          changes.push({ field: getFieldName(currentPath), oldValue: oldRef || null, newValue: newRef || null });
        }
        continue;
      }

      // 5. Handle Objects (Recursive)
      if (this.isObject(oldVal) && this.isObject(newVal)) {
        changes.push(...this.computeDiff(oldVal, newVal, currentPath, ignoredPaths, itemIdentityMap, fieldDisplayNameMap));
        continue;
      }

      // 6. Primitives
      if (oldVal !== newVal) {
        changes.push({ field: getFieldName(currentPath), oldValue: oldVal, newValue: newVal });
      }
    }

    return changes;
  }

  private diffArray(
    oldArr: any[], 
    newArr: any[], 
    path: string, 
    ignoredPaths: string[], 
    itemIdentityMap: Record<string, string>, 
    fieldDisplayNameMap: Record<string, string>
  ): AuditChange[] {

    const changes: AuditChange[] = [];

    // Check if array contains objects with _id (Stable ID strategy)
    // Both arrays (if not empty) must have _ids to use this strategy
    const oldHasIds = oldArr.length === 0 || (oldArr[0] && oldArr[0]._id);
    const newHasIds = newArr.length === 0 || (newArr[0] && newArr[0]._id);
    const isStableArray = oldHasIds && newHasIds;

    // Check if it is a "Reference Array" (Array of populated objects)
    const isReferenceArray = (oldArr.length > 0 && this.isReference(oldArr[0])) || (newArr.length > 0 && this.isReference(newArr[0]));

    if (isStableArray) {
      let labelKey = itemIdentityMap[path];
      let valueOnly = false;

      // Support for "Value Only" syntax: "^key"
      if (labelKey && labelKey.startsWith('^')) {
        labelKey = labelKey.substring(1);
        valueOnly = true;
      }

      const oldMap = new Map(oldArr.map((item) => [String(item._id), item]));
      const newMap = new Map(newArr.map((item) => [String(item._id), item]));

      // Helper to generate field name
      const getFieldPath = (item: any, id: string) => {
        // If it's a reference array, we don't want noisy labels like userIds[_id=...].
        // We just want "userIds". The value will clarify what changed.
        if (isReferenceArray) return fieldDisplayNameMap[path] || path;

        const labelValue = labelKey ? this.resolvePath(item, labelKey) : undefined;
        const basePath = fieldDisplayNameMap[path] || path;

        if (labelValue !== undefined) {
          return valueOnly
            ? `${basePath} - ${labelValue}`
            : `${basePath}[${labelKey}=${labelValue}]`;
        }
        return `${basePath}[_id=${id}]`;
      };

      // Helper to sanitize object for log value (removes _id and optionally labelKey)
      const sanitize = (item: any) => {
        // If reference, format it immediately
        if (this.isReference(item)) {
          return this.formatReference(item);
        }

        if (!item || typeof item !== 'object') return item;
        const clone = { ...item };
        delete clone._id;

        if (labelKey) {
          // Removes the property used for labeling from the value object.
          // If complex path (e.g. varietyId.name), removes the rootKey (varietyId).
          const rootKey = labelKey.split('.')[0];
          delete clone[rootKey];
        }
        return clone;
      };


      // Check for modifications and removals
      for (const [id, oldItem] of oldMap) {
        const newItem = newMap.get(id);
        const fieldName = getFieldPath(oldItem, id);

        if (!newItem) {
          // Removed
          changes.push({
            field: fieldName,
            oldValue: sanitize(oldItem),
            newValue: null,
          });
        } else {
          // Modified? Recurse
          changes.push(...this.computeDiff(oldItem, newItem, fieldName, ignoredPaths, itemIdentityMap, fieldDisplayNameMap));
        }
      }

      // Check for additions
      for (const [id, newItem] of newMap) {
        if (!oldMap.has(id)) {
          const fieldName = getFieldPath(newItem, id);
          changes.push({
            field: fieldName,
            oldValue: null,
            newValue: sanitize(newItem),
          });
        }
      }
    } else {
      // Simple array comparison (replace strategy or index-based)
      // For simplicity, if arrays differ, we log the whole array change
      // Or we could try to match by value, but that's expensive.
      if (JSON.stringify(oldArr) !== JSON.stringify(newArr)) {
        changes.push({ field: fieldDisplayNameMap[path] || path, oldValue: oldArr, newValue: newArr });
      }
    }

    return changes;
  }

  private isReference(obj: any): boolean {
    return obj && typeof obj === 'object' && 'recordId' in obj && 'name' in obj;
  }

  private formatReference(obj: any): string | null {
    if (this.isReference(obj)) {
      return `${obj.recordId} ${obj.name}`;
    }
    return null;
  }

  private resolvePath(obj: any, path: string): any {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
  }

  private isObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof Types.ObjectId);
  }
}
