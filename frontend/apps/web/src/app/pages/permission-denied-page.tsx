// frontend/apps/web/src/app/pages/permission-denied-page.tsx
import { Container, Title, Text, Button, Group, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { layout } from '@rootstock/ui/theme';

export function PermissionDeniedPage() {
  const navigate = useNavigate();

  return (
    <Container size={layout.container.sm} py={80}>
      <Stack align="center" gap="lg">
        <Title order={1} size={42} fw={900} ta="center">
          Permission Denied
        </Title>
        <Text c="dimmed" size="lg" ta="center" maw={500}>
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </Text>
        <Group justify="center">
          <Button size="md" onClick={() => navigate('/')}>
            Take me back to home page
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}