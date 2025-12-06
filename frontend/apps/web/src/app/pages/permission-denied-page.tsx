import { Container, Title, Text, Button, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function PermissionDeniedPage() {
  const navigate = useNavigate();

  return (
    <Container className="py-20">
      <div className="text-center">
        <Title className="text-4xl font-bold mb-4">Permission Denied</Title>
        <Text c="dimmed" size="lg" className="mb-8">
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </Text>
        <Group justify="center">
          <Button size="md" onClick={() => navigate('/')}>
            Take me back to home page
          </Button>
        </Group>
      </div>
    </Container>
  );
}
