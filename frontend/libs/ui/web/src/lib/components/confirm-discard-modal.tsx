import { Modal, Text, Group, Button } from '@mantine/core';
import { palette } from '@rootstock/ui/theme';

export interface ConfirmDiscardModalProps {
  opened: boolean;
  onClose: () => void;   // "Keep Editing"
  onConfirm: () => void; // "Discard Changes"
}

export function ConfirmDiscardModal({ opened, onClose, onConfirm }: ConfirmDiscardModalProps) {
  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Unsaved Changes" 
      centered
    >
      <Text size="sm">
        You have unsaved changes. Are you sure you want to discard them?
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Keep Editing
        </Button>
        <Button color={palette.icons.delete} onClick={onConfirm}>
          Discard Changes
        </Button>
      </Group>
    </Modal>
  );
}