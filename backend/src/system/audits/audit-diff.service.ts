import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditChange } from './schemas/audit.schema';

@Injectable()
export class AuditDiffService {
  /**
   * Computes the difference between two objects.
   * Returns an array of AuditChange.
   */
  computeDiff(oldObj: any, newObj: any, prefix = '', ignoredPaths: string[] = [], labelConfig: Record<string, string> = {}): AuditChange[] {
    const changes: AuditChange[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    // Fields to ignore
    const systemIgnoredFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password', 'hash'];

    for (const key of allKeys) {
      if (systemIgnoredFields.includes(key)) continue;

      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (ignoredPaths.includes(currentPath)) continue;

      // 1. Handle Arrays
      if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        const arrayChanges = this.diffArray(oldVal || [], newVal || [], currentPath, ignoredPaths, labelConfig);
        changes.push(...arrayChanges);
        continue;
      }

      // 2. Handle Dates
      if (oldVal instanceof Date || newVal instanceof Date) {
        const t1 = oldVal instanceof Date ? oldVal.getTime() : oldVal;
        const t2 = newVal instanceof Date ? newVal.getTime() : newVal;
        if (t1 !== t2) {
          changes.push({ field: currentPath, oldValue: oldVal, newValue: newVal });
        }
        continue;
      }

      // 3. Handle ObjectIds
      if (oldVal instanceof Types.ObjectId || newVal instanceof Types.ObjectId) {
        if (String(oldVal) !== String(newVal)) {
          changes.push({ field: currentPath, oldValue: oldVal, newValue: newVal });
        }
        continue;
      }

      // 4. Handle Objects (Recursive)
      if (this.isObject(oldVal) && this.isObject(newVal)) {
        changes.push(...this.computeDiff(oldVal, newVal, currentPath, ignoredPaths, labelConfig));
        continue;
      }

      // 5. Primitives
      if (oldVal !== newVal) {
        changes.push({ field: currentPath, oldValue: oldVal, newValue: newVal });
      }
    }

    return changes;
  }

  private diffArray(oldArr: any[], newArr: any[], path: string, ignoredPaths: string[], labelConfig: Record<string, string>): AuditChange[] {
    const changes: AuditChange[] = [];

    // Check if array contains objects with _id (Stable ID strategy)
    // Both arrays (if not empty) must have _ids to use this strategy
    const oldHasIds = oldArr.length === 0 || (oldArr[0] && oldArr[0]._id);
    const newHasIds = newArr.length === 0 || (newArr[0] && newArr[0]._id);
    const isStableArray = oldHasIds && newHasIds;

    if (isStableArray) {
      let labelKey = labelConfig[path];
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
         const labelValue = labelKey ? this.resolvePath(item, labelKey) : undefined;
         if (labelValue !== undefined) {
             return valueOnly 
                ? `${path}[${labelValue}]` 
                : `${path}[${labelKey}=${labelValue}]`;
         }
         return `${path}[_id=${id}]`;
      };

      // Helper to sanitize object for log value (removes _id and optionally labelKey)
      const sanitize = (item: any) => {
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
          changes.push(...this.computeDiff(oldItem, newItem, fieldName, ignoredPaths, labelConfig));
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
         changes.push({ field: path, oldValue: oldArr, newValue: newArr });
      }
    }

    return changes;
  }

  private resolvePath(obj: any, path: string): any {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
  }

  private isObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof Types.ObjectId);
  }
}
