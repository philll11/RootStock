import React, { createContext, useContext, useCallback } from 'react';
import { useAuthSession, useLogin, useLogout } from 'hooks/iam/useAuth';
import { User } from 'types/iam/user.types';
import Loader from 'ui-component/Loader';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | undefined;
    login: ReturnType<typeof useLogin>['mutateAsync'];
    logout: ReturnType<typeof useLogout>['mutateAsync'];
    can: (permission: string) => boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const usePermission = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('usePermission must be used within AuthProvider');
    return context;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated, isLoading } = useAuthSession();
    const { mutateAsync: login } = useLogin();
    const { mutateAsync: logout } = useLogout();

    const can = useCallback((permission: string) => {
        if (!user || !user.roleId || !user.roleId.permissions) return false;
        return user.roleId.permissions.includes(permission);
    }, [user]);

    if (isLoading) {
        return <Loader />;
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            logout,
            can,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};
