import React, { useEffect } from 'react';
import { usePermission } from '@/features/iam/auth/data';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

interface ProtectedScreenProps {
  permission: string;
  children: React.ReactNode;
}

export const ProtectedScreen = ({ permission, children }: ProtectedScreenProps) => {
  const { hasPermission } = usePermission();
  const router = useRouter();
  const [isChecking, setIsChecking] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);

  useEffect(() => {
    const check = () => {
      const has = hasPermission(permission);
      setAuthorized(has);
      setIsChecking(false);
      
      if (!has) {
        setTimeout(() => {
            router.replace('/permission-denied');
        }, 0);
      }
    };
    check();
  }, [permission, hasPermission, router]);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authorized) {
    return null; // Will redirect
  }

  return <>{children}</>;
};
