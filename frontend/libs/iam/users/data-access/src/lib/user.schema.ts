import { z } from 'zod';
import { UserType } from './user.types';

export const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Invalid email address'),
    password: z.string().optional(),
    userType: z.enum(UserType),
    roleId: z.string().optional(),
    clientIds: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
    __v: z.number().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
