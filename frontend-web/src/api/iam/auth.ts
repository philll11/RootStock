// src/api/iam/auth.ts
import axiosServices from 'utils/axios';
import { LoginCredentials, AuthResponse, ResetPasswordRequest } from '../../types/iam/auth.schema';
import { User } from '../../types/iam/user.types';

const ENDPOINTS = {
    LOGIN: '/auth/local/login',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
};

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const payload = {
        email: credentials.username,
        password: credentials.password
    };

    // The backend sets the HttpOnly cookie automatically
    const response = await axiosServices.post<AuthResponse>(ENDPOINTS.LOGIN, payload, {
        headers: {
            'x-client-platform': 'web'
        }
    });
    return response.data;
};

export const logout = async (): Promise<void> => {
    await axiosServices.post(ENDPOINTS.LOGOUT);
};

export const getProfile = async (): Promise<User> => {
    try {
        const response = await axiosServices.get<User>(ENDPOINTS.PROFILE);
        return response.data;
    } catch (error) {
        console.error('[API] getProfile failed:', error);
        throw error;
    }
};

export const forgotPassword = async (email: string): Promise<void> => {
    await axiosServices.post(ENDPOINTS.FORGOT_PASSWORD, { email });
};

export const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
    await axiosServices.post(ENDPOINTS.RESET_PASSWORD, {
        token: data.token,
        newPassword: data.password
    });
};
