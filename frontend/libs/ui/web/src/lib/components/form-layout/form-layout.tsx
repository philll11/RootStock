import { Box, LoadingOverlay, Stack, StackProps, Group, Button } from '@mantine/core';
import { FormEventHandler, ReactNode } from 'react';
import { FormActions } from '../form-actions/form-actions';

export type FormMode = 'create' | 'edit' | 'view';

export interface FormLayoutProps extends Omit<StackProps, 'onSubmit'> {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  isLoading?: boolean;
  mode?: FormMode;
  onCancel?: () => void;
  onClear?: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  isDirty?: boolean;
  submitLabel?: string;
}

export function FormLayout({ 
  children, 
  onSubmit, 
  isLoading = false, 
  gap = 'md',
  mode,
  onCancel,
  onClear,
  onEdit,
  canEdit = true,
  isDirty,
  submitLabel,
  ...stackProps 
}: FormLayoutProps) {
  const isView = mode === 'view';
  const isCreate = mode === 'create';

  return (
    <form onSubmit={onSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box pos="relative" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        <Stack gap={gap} {...stackProps} style={{ flex: 1 }}>
          {children}
        </Stack>
        
        <Box mt="xl">
          {isView ? (
            <Group justify="flex-end">
              <Button variant="default" onClick={onCancel}>Close</Button>
              {canEdit && onEdit && (
                <Button onClick={onEdit}>Edit</Button>
              )}
            </Group>
          ) : (
            <FormActions 
              onCancel={onCancel} 
              onClear={onClear}
              isSubmitting={isLoading} 
              submitLabel={submitLabel || (isCreate ? 'Create' : 'Save')}
              // Only disable save if explicitly not dirty in edit mode. 
              // If isDirty is undefined, we assume it's handled by the form or we don't block.
              disabled={isDirty === false && !isCreate} 
            />
          )}
        </Box>
      </Box>
    </form>
  );
}
