import { Group, Title, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  onActionClick?: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
}

export function PageHeader({ title, action, onActionClick, actionLabel, actionIcon }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="lg">
      <Title order={2}>{title}</Title>
      {action}
      {!action && onActionClick && actionLabel && (
        <Button leftSection={actionIcon || <IconPlus size={16} />} onClick={onActionClick}>
          {actionLabel}
        </Button>
      )}
    </Group>
  );
}
