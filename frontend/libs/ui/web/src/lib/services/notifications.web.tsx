import { notifications } from '@mantine/notifications';
import { Button } from '@mantine/core';
import { getErrorMessage, NotificationAdapter } from '@rootstock/shared/util';
import { spacing, palette } from '@rootstock/ui/theme';

export const webNotificationAdapter: NotificationAdapter = {
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

  errorWithAction: (error: any, actionLabel: string, onAction: () => void, title = 'Error') => {
    const message = getErrorMessage(error);
    const id = `error-action-${Date.now()}`;
    
    notifications.show({
      id,
      title,
      message: (
        <div>
          <div>{message}</div>
          <div style={{ marginTop: spacing.sm }}>
            <Button 
              size="xs" 
              variant="light" 
              color="red" 
              onClick={() => {
                onAction();
                notifications.hide(id);
              }}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      ),
      color: 'red',
      autoClose: 14000,
    });
  },

  validation: (message = 'Please check the highlighted fields for errors.') => {
    notifications.show({
      title: 'Validation Error',
      message,
      color: 'red',
      autoClose: 7000,
    });
  },

  info: (message: string, title = 'Information') => {
    notifications.show({
      title,
      message,
      color: 'blue',
      autoClose: 5000,
    });
  }
};
