import { z } from 'zod';
import { UserType } from '../../types/iam/user.types';

export const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')
        .or(z.literal(''))
        .optional(),
    userType: z.enum(UserType),
    roleId: z.string().min(1, 'Role is required'),
    clientIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    __v: z.number().optional(),
}).refine((data) => {
    if (data.userType === UserType.Contact) {
        return data.clientIds && data.clientIds.length === 1;
    }
    return true;
}, {
    message: "Contacts must have exactly one client assigned",
    path: ["clientIds"]
});

export type UserFormData = z.infer<typeof userSchema>;
