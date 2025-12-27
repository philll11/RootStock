import { ReactNode } from 'react';
import { Tabs, Text, Box, Badge } from '@mantine/core';

export interface SubResourceTab {
  value: string;
  label: string;
  content: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface SubResourceTabsProps {
  /** Array of tab definitions */
  tabs: SubResourceTab[];
  /** The value of the tab that should be active initially */
  defaultValue?: string;
  /** Optional title displayed above the tabs (e.g. "Permissions") */
  title?: string;
}

export function SubResourceTabs({ tabs, defaultValue, title }: SubResourceTabsProps) {
  return (
    <Box mt="xl">
      {title && (
        <Text size="lg" fw={600} mb="md">
          {title}
        </Text>
      )}
      <Tabs defaultValue={defaultValue || tabs[0]?.value} variant="outline">
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.value}
              value={tab.value}
              leftSection={tab.icon}
              rightSection={
                tab.count !== undefined && (
                  <Badge size="xs" variant="light" circle>
                    {tab.count}
                  </Badge>
                )
              }
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            {tab.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  );
}
