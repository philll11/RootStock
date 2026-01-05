import { z } from 'zod';

export const orchardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  clientId: z.string().nullable().refine((val) => val !== null && val.length > 0, { message: 'Client is required' }),
  userIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  __v: z.number().optional(),
});

export type OrchardFormData = z.infer<typeof orchardSchema>;
