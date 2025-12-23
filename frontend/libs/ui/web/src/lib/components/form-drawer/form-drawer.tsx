import { Drawer, LoadingOverlay } from '@mantine/core';
import { ReactNode } from 'react';

export interface FormDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  size?: string | number;
  position?: 'left' | 'right' | 'top' | 'bottom';
}

export function FormDrawer({ 
  opened, 
  onClose, 
  title, 
  children, 
  isLoading, 
  size = 'md',
  position = 'right'
}: FormDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={position}
      size={size}
      padding="md"
    >
      <LoadingOverlay visible={!!isLoading} overlayProps={{ blur: 2 }} />
      {children}
    </Drawer>
  );
}
