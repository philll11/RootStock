import { Alert } from 'react-native';
import { getErrorMessage, NotificationAdapter } from '@rootstock/shared/util';

export const mobileNotificationAdapter: NotificationAdapter = {
  success: (message: string, title = 'Success') => {
    Alert.alert(title, message);
  },

  error: (error: any, title = 'Error') => {
    const message = getErrorMessage(error);
    Alert.alert(title, message);
  },

  errorWithAction: (error: any, actionLabel: string, onAction: () => void, title = 'Error') => {
    const message = getErrorMessage(error);
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: actionLabel, onPress: onAction }
    ]);
  },

  validation: (message = 'Please check the highlighted fields for errors.') => {
    Alert.alert('Validation Error', message);
  },

  info: (message: string, title = 'Information') => {
    Alert.alert(title, message);
  }
};
