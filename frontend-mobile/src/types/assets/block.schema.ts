import { z } from 'zod';

export const plantingSchema = z.object({
  _id: z.string().optional(),
  varietyId: z.string().min(1, 'Variety is required'),
  treeCount: z.number().min(0, 'Tree count must be positive')
});

export const blockSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  orchardId: z.string().min(1, 'Orchard is required'),
  plantings: z.array(plantingSchema).min(1, 'At least one planting is required'),
  isActive: z.boolean().optional(),
  __v: z.number().optional()
});

export type BlockFormData = z.infer<typeof blockSchema>;
