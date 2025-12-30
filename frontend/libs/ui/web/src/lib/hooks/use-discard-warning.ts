import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useBlocker } from 'react-router-dom';

export function useDiscardWarning(isDirty: boolean) {
  const [opened, { open, close }] = useDisclosure(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      open();
    }
  }, [blocker.state, open]);

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
    if (pendingAction) {
      pendingAction();
    }
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
    close();
    setPendingAction(null);
  };

  const cancelDiscard = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    close();
    setPendingAction(null);
  };

  // Handle browser unload (refresh/close tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    handleAction,
    modalProps: {
      opened,
      onClose: cancelDiscard,
      onConfirm: confirmDiscard,
    },
  };
}
