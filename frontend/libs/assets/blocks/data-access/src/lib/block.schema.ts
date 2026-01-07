import { z } from 'zod';

export const plantingSchema = z.object({
  _id: z.string().optional(),
  varietyId: z.string().nullable().refine((val) => val !== null && val.length > 0, { message: 'Variety is required' }),
  treeCount: z.coerce.number().min(0, 'Tree count must be positive'),
});

export const blockSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  orchardId: z.string().nullable().refine((val) => val !== null && val.length > 0, { message: 'Orchard is required' }),
  plantings: z.array(plantingSchema).min(1, 'At least one planting is required'),
  isActive: z.boolean().optional(),
  __v: z.number().optional(),
});

export type BlockFormData = z.infer<typeof blockSchema>;
