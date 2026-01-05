import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditChange } from './schemas/audit.schema';

@Injectable()
export class AuditDiffService {
  /**
   * Computes the difference between two objects.
   * Returns an array of AuditChange.
   */
  computeDiff(oldObj: any, newObj: any, prefix = ''): AuditChange[] {
    const changes: AuditChange[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    // Fields to ignore
    const ignoredFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password', 'hash'];

    for (const key of allKeys) {
      if (ignoredFields.includes(key)) continue;

      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;
      const currentPath = prefix ? `${prefix}.${key}` : key;

      // 1. Handle Arrays
      if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        const arrayChanges = this.diffArray(oldVal || [], newVal || [], currentPath);
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
        changes.push(...this.computeDiff(oldVal, newVal, currentPath));
        continue;
      }

      // 5. Primitives
      if (oldVal !== newVal) {
        changes.push({ field: currentPath, oldValue: oldVal, newValue: newVal });
      }
    }

    return changes;
  }

  private diffArray(oldArr: any[], newArr: any[], path: string): AuditChange[] {
    const changes: AuditChange[] = [];

    // Check if array contains objects with _id (Stable ID strategy)
    const isStableArray = (oldArr.length > 0 && oldArr[0]?._id) || (newArr.length > 0 && newArr[0]?._id);

    if (isStableArray) {
      const oldMap = new Map(oldArr.map((item) => [String(item._id), item]));
      const newMap = new Map(newArr.map((item) => [String(item._id), item]));

      // Check for modifications and removals
      for (const [id, oldItem] of oldMap) {
        const newItem = newMap.get(id);
        if (!newItem) {
          // Removed
          changes.push({
            field: `${path}[_id=${id}]`,
            oldValue: oldItem,
            newValue: null,
          });
        } else {
          // Modified? Recurse
          changes.push(...this.computeDiff(oldItem, newItem, `${path}[_id=${id}]`));
        }
      }

      // Check for additions
      for (const [id, newItem] of newMap) {
        if (!oldMap.has(id)) {
          changes.push({
            field: `${path}[_id=${id}]`,
            oldValue: null,
            newValue: newItem,
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

  private isObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof Types.ObjectId);
  }
}
