import { z } from 'zod';

export const varietySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional(),
  __v: z.number().optional(),
});

export type VarietyFormData = z.infer<typeof varietySchema>;
