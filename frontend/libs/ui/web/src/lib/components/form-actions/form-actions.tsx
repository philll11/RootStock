import { Group, Button } from '@mantine/core';

export interface FormActionsProps {
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showSubmit?: boolean;
  disabled?: boolean;
}

export function FormActions({ 
  onCancel, 
  isSubmitting, 
  submitLabel = 'Save', 
  cancelLabel = 'Cancel',
  showSubmit = true,
  disabled = false
}: FormActionsProps) {
  return (
    <Group justify="flex-end" mt="xl">
      <Button variant="default" onClick={onCancel} disabled={isSubmitting} type="button">
        {cancelLabel}
      </Button>
      {showSubmit && (
        <Button type="submit" loading={isSubmitting} disabled={disabled}>
          {submitLabel}
        </Button>
      )}
    </Group>
  );
}
