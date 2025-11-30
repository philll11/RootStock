import { notifications } from '@mantine/notifications';
import { getErrorMessage } from './error-utils';

export const notify = {
  success: (message: string, title = 'Success') => {
    notifications.show({
      title,
      message,
      color: 'green',
      autoClose: 3000,
    });
  },

  error: (error: any, title = 'Error') => {
    const message = getErrorMessage(error);

    notifications.show({
      title,
      message,
      color: 'red',
      autoClose: 7000,
    });
  },

  validation: (message = 'Please check the highlighted fields for errors.') => {
    notifications.show({
      title: 'Validation Error',
      message,
      color: 'red',
      autoClose: 7000,
    });
  }
};
