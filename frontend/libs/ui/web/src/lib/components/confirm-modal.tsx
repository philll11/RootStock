import { Modal, Text, Group, Button } from '@mantine/core';
import { palette } from '@rootstock/ui/theme';

export interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
}

export function ConfirmModal({ 
  opened, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  confirmColor = palette.icons.delete 
}: ConfirmModalProps) {
  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={title} 
      centered
    >
      <Text size="sm">
        {message}
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button color={confirmColor} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}