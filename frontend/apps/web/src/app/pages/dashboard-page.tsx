// frontend/apps/web/src/app/pages/dashboard-page.tsx
import { Skeleton, Title, SimpleGrid, Paper } from '@mantine/core';
import { shadows } from '@rootstock/ui/theme';

export function DashboardPage() {
  return (
    <>
      <Title order={2} mb="lg">Dashboard</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Paper shadow={shadows.card} p="md" radius="md" withBorder>
          <Skeleton height={150} radius="md" animate={false} />
        </Paper>
        <Paper shadow={shadows.card} p="md" radius="md" withBorder>
          <Skeleton height={150} radius="md" animate={false} />
        </Paper>
        <Paper shadow={shadows.card} p="md" radius="md" withBorder>
          <Skeleton height={150} radius="md" animate={false} />
        </Paper>
      </SimpleGrid>
    </>
  );
}