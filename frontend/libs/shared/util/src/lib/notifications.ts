export interface NotificationAdapter {
  success(message: string, title?: string): void;
  error(error: any, title?: string): void;
  errorWithAction(error: any, actionLabel: string, onAction: () => void, title?: string): void;
  validation(message?: string): void;
  info(message: string, title?: string): void;
}

class NotificationService implements NotificationAdapter {
  private adapter: NotificationAdapter | null = null;

  setAdapter(adapter: NotificationAdapter) {
    this.adapter = adapter;
  }

  success(message: string, title?: string) {
    if (this.adapter) {
      this.adapter.success(message, title);
    } else {
      console.log('Notification (Success):', message);
    }
  }

  error(error: any, title?: string) {
    if (this.adapter) {
      this.adapter.error(error, title);
    } else {
      console.error('Notification (Error):', error);
    }
  }

  errorWithAction(error: any, actionLabel: string, onAction: () => void, title?: string) {
    if (this.adapter) {
      this.adapter.errorWithAction(error, actionLabel, onAction, title);
    } else {
      console.error('Notification (Error with Action):', error);
    }
  }

  validation(message?: string) {
    if (this.adapter) {
      this.adapter.validation(message);
    } else {
      console.warn('Notification (Validation):', message);
    }
  }

  info(message: string, title?: string) {
    if (this.adapter) {
      this.adapter.info(message, title);
    } else {
      console.info('Notification (Info):', message);
    }
  }
}

export const notify = new NotificationService();
