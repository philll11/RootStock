import { Button, Menu, Group, ActionIcon, useMantineTheme, rem } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { iconSizes } from '@rootstock/ui/theme';

export interface ActionSplitButtonOption {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

export interface ActionSplitButtonProps {
  mainLabel: string;
  onMainClick: () => void;
  mainIcon?: ReactNode;
  options: ActionSplitButtonOption[];
}

export function ActionSplitButton({ mainLabel, onMainClick, mainIcon, options }: ActionSplitButtonProps) {
  const theme = useMantineTheme();

  return (
    <Group gap={0}>
      <Button
        onClick={onMainClick}
        leftSection={mainIcon}
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
      >
        {mainLabel}
      </Button>
      <Menu transitionProps={{ transition: 'pop' }} position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: `1px solid rgba(255, 255, 255, 0.2)` }}
            px={4}
          >
            <IconChevronDown style={{ width: rem(iconSizes.md), height: rem(iconSizes.md) }} stroke={1.5} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {options.map((option, index) => (
            <Menu.Item
              key={index}
              leftSection={option.icon}
              onClick={option.onClick}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
