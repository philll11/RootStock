import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  subsidiaryId: z.string().optional(),
  isActive: z.boolean().default(true),
  __v: z.number().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
