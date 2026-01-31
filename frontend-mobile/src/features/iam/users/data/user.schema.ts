import { z } from 'zod';
import { UserType } from './user.types';

export const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')
        .or(z.literal(''))
        .optional(),
    userType: z.enum(UserType),
    roleId: z.string().optional(),
    clientIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    __v: z.number().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
