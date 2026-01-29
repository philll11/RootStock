import { z } from 'zod';

export const orchardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  clientId: z.string().min(1, 'Client is required'),
  userIds: z.array(z.string()),
  isActive: z.boolean().optional(),
  __v: z.number().optional(),
});

export type OrchardFormData = z.infer<typeof orchardSchema>;
