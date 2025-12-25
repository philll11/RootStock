import { Group, Button } from '@mantine/core';

export interface FormActionsProps {
  onCancel?: () => void;
  onClear?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  clearLabel?: string;
  showSubmit?: boolean;
  disabled?: boolean;
}

export function FormActions({ 
  onCancel, 
  onClear,
  isSubmitting, 
  submitLabel = 'Save', 
  cancelLabel = 'Cancel',
  clearLabel = 'Clear',
  showSubmit = true,
  disabled = false
}: FormActionsProps) {
  return (
    <Group justify="space-between" mt="xl">
      {onClear ? (
        <Button variant="subtle" color="red" onClick={onClear} disabled={isSubmitting} type="button">
          {clearLabel}
        </Button>
      ) : <div />}
      
      <Group>
        <Button variant="default" onClick={onCancel} disabled={isSubmitting} type="button">
          {cancelLabel}
        </Button>
        {showSubmit && (
          <Button type="submit" loading={isSubmitting} disabled={disabled}>
            {submitLabel}
          </Button>
        )}
      </Group>
    </Group>
  );
}
