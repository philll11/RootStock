import { z } from 'zod';
import { VisibilityScope } from 'constants/permissions';

export const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  visibilityScope: z.enum(VisibilityScope),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  __v: z.number().optional(),
});

export type RoleFormData = z.infer<typeof roleSchema>;
