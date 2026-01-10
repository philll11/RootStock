import React, { useEffect, useState } from 'react';
import { Snackbar, useTheme } from 'react-native-paper';
import { mobileNotificationAdapter } from '../services/notifications.mobile';
import { AppTheme } from '../mobile-theme';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme<AppTheme>();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    mobileNotificationAdapter.setListener((type, msg, title) => {
      setMessage(msg);
      setType(type);
      setVisible(true);
    });
    return () => mobileNotificationAdapter.setListener(() => {});
  }, []);

  const onDismiss = () => setVisible(false);

  return (
    <>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={3000}
        style={{
          backgroundColor: type === 'error' ? theme.colors.error : theme.colors.inverseSurface,
        }}
      >
        {message}
      </Snackbar>
    </>
  );
}
