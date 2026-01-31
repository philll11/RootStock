import { Alert } from 'react-native';
import { getErrorMessage, NotificationAdapter } from '@/utils';

type NotificationListener = (type: 'success' | 'error' | 'info' | 'warn', message: string, title?: string) => void;

class MobileNotificationService implements NotificationAdapter {
  private listener: NotificationListener | null = null;

  setListener(listener: NotificationListener) {
    this.listener = listener;
  }

  success(message: string, title = 'Success') {
    if (this.listener) {
      this.listener('success', message, title);
    } else {
      Alert.alert(title, message);
    }
  }

  error(error: any, title = 'Error') {
    const message = getErrorMessage(error);
    Alert.alert(title, message);
  }

  errorWithAction(error: any, actionLabel: string, onAction: () => void, title = 'Error') {
    const message = getErrorMessage(error);
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: actionLabel, onPress: onAction }
    ]);
  }

  validation(message = 'Please check the highlighted fields for errors.') {
    Alert.alert('Validation Error', message);
  }

  warn(message: string, title = 'Warning') {
    if (this.listener) {
      this.listener('warn', message, title);
    } else {
      Alert.alert(title, message);
    }
  }

  info(message: string, title = 'Information') {
    if (this.listener) {
      this.listener('info', message, title);
    } else {
      Alert.alert(title, message);
    }
  }
}

export const mobileNotificationAdapter = new MobileNotificationService();
