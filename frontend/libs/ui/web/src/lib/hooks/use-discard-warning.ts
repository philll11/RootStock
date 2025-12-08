import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';

export function useDiscardWarning(isDirty: boolean) {
  const [opened, { open, close }] = useDisclosure(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  /**
   * Wraps an action (like closing a drawer).
   * If dirty, opens the warning modal.
   * If clean, executes the action immediately.
   */
  const handleAction = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      open();
    } else {
      action();
    }
  };

  const confirmDiscard = () => {
    if (pendingAction) pendingAction();
    close();
    setPendingAction(null);
  };

  const cancelDiscard = () => {
    close();
    setPendingAction(null);
  };

  return {
    handleAction,
    modalProps: {
      opened,
      onClose: cancelDiscard,
      onConfirm: confirmDiscard,
    },
  };
}
