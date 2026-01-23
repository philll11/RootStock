import { useState, useCallback } from 'react';
import { useBlocker, BlockerFunction } from 'react-router-dom';

/**
 * Hook to warn user about unsaved changes on navigation or manual actions.
 * @param when - Boolean to enable the check (usually isDirty)
 * @param message - Custom message for the dialog
 */
export function useDiscardWarning(when: boolean, message: string = 'You have unsaved changes. Are you sure you want to discard them?') {
  // 1. Handle Navigation Blocking (React Router)
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        return when && currentLocation.pathname !== nextLocation.pathname;
      },
      [when]
    ) as BlockerFunction
  );

  // 2. Handle Manual Action Blocking (e.g. Cancel Button, Drawer Close)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  const trigger = (action: () => void, msg?: string) => {
    setPendingAction(() => action);
    if (msg) setCustomMessage(msg);
    setManualOpen(true);
  };

  const closeDialog = () => {
    // Reset Router Block
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    // Reset Manual Block
    setManualOpen(false);
    setPendingAction(null);
    setCustomMessage(null);
  };

  const confirmAction = () => {
    // Proceed Router Block
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
    // Proceed Manual Block
    if (pendingAction) {
      pendingAction();
    }
    closeDialog();
  };

  return {
    // Pass these props directly to <ConfirmDialog {...discardDialogProps} />
    discardDialogProps: {
      open: blocker.state === 'blocked' || manualOpen,
      title: 'Unsaved Changes',
      content: customMessage || message,
      onCancel: closeDialog,
      onConfirm: confirmAction,
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing',
      confirmColor: 'error' as const,
    },
    /**
     * Wrap your manual close/cancel handlers with this function.
     * @example handleClose = () => trigger(() => setOpen(false));
     */
    trigger,
  };
}
