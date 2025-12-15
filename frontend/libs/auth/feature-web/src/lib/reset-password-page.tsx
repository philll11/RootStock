// frontend/libs/auth/feature-web/src/lib/reset-password-page.tsx
import {
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AuthService } from '@rootstock/auth/auth-data-access';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notify } from '@rootstock/shared/util';
import { shadows } from '@rootstock/ui/theme';

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
      confirmPassword: (value, values) => (value !== values.password ? 'Passwords did not match' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!token) {
      notify.error('Invalid reset token', 'Error');
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(token, values.password);
      notify.success('Your password has been reset.', 'Success');
      navigate('/login');
    } catch (error) {
      notify.error(error, 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my="xl">
      <Title ta="center">
        Reset Password
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt="xs">
        Enter your new password
      </Text>

      <Paper withBorder shadow={shadows.card} p="xl" mt="xl" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <PasswordInput
            label="New Password"
            placeholder="New secure password"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Reset Password
          </Button>
        </form>
      </Paper>
    </Container>
  );
}