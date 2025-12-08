import React, { useEffect } from 'react';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { useNavigation } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';

interface ProtectedScreenProps {
  permission: string;
  children: React.ReactNode;
}

export const ProtectedScreen = ({ permission, children }: ProtectedScreenProps) => {
  const { hasPermission } = usePermission();
  const navigation = useNavigation<any>();
  const [isChecking, setIsChecking] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);

  useEffect(() => {
    const check = () => {
      const has = hasPermission(permission);
      setAuthorized(has);
      setIsChecking(false);
      
      if (!has) {
        // We need to wait for the navigation to be ready or just navigate
        // Using a small timeout to ensure we don't navigate during a render
        setTimeout(() => {
            navigation.replace('PermissionDenied');
        }, 0);
      }
    };
    check();
  }, [permission, hasPermission, navigation]);

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
