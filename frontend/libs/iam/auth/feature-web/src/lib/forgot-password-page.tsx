// frontend/libs/auth/feature-web/src/lib/forgot-password-page.tsx
import {
  TextInput,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Button,
  Anchor,
  Center,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AuthService } from '@rootstock/iam/auth/auth-data-access';
import { useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notify } from '@rootstock/shared/util';
import { shadows, iconSizes } from '@rootstock/ui/theme';

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await AuthService.forgotPassword(values.email);
      notify.success(
        'If an account exists, a reset link has been sent.',
        'Check your email'
      );
      navigate('/login');
    } catch (error) {
      notify.error(error, 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my="xl">
      <Title ta="center">Forgot your password?</Title>
      <Text c="dimmed" size="sm" ta="center" mt="xs">
        Enter your email to get a reset link
      </Text>

      <Paper withBorder shadow={shadows.card} p="xl" mt="xl" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps('email')}
          />
          <Group justify="space-between" mt="xl">
            <Anchor c="dimmed" size="sm" onClick={() => navigate('/login')}>
              <Center inline>
                <IconArrowLeft
                  style={{ width: iconSizes.sm, height: iconSizes.sm }}
                  stroke={1.5}
                />
                <Box ml={5}>Back to login</Box>
              </Center>
            </Anchor>
            <Button type="submit" loading={loading}>
              Reset password
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}
