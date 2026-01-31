export interface AppControlAdapter {
  reload(): void;
}

class AppControlService implements AppControlAdapter {
  private adapter: AppControlAdapter | null = null;

  setAdapter(adapter: AppControlAdapter) {
    this.adapter = adapter;
  }

  reload() {
    if (this.adapter) {
      this.adapter.reload();
    } else {
      console.warn('AppControl: Reload requested but no adapter registered.');
    }
  }
}

export const appControl = new AppControlService();
