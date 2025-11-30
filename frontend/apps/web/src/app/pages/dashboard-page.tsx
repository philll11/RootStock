import { Skeleton, Title } from '@mantine/core';

export function DashboardPage() {
  return (
    <>
      <Title order={2} mb="lg">Dashboard</Title>
      <Skeleton height={200} radius="md" animate={false} />
      <Skeleton height={200} radius="md" mt="md" animate={false} />
    </>
  );
}

