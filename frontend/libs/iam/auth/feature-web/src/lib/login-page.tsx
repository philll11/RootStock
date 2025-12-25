// frontend/libs/auth/feature-web/src/lib/login-page.tsx
import {
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Button,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useLogin } from '@rootstock/auth/auth-data-access';
import { useNavigate } from 'react-router-dom';
import { notify } from '@rootstock/shared/util';
import { shadows } from '@rootstock/ui/theme';

export function LoginPage() {
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: 'leo.phil.work@gmail.com',
      password: '',
    },
    validate: {
      username: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length < 1 ? 'Password is required' : null),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        navigate('/');
      },
      onError: (error) => {
        notify.error(error, 'Login Failed');
        form.setFieldValue('password', ''); // Clear password on failure
      },
    });
  };

  return (
    <Container size={420} my="xl">
      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt="xs">
        Do not have an account yet?{' '}
        <Anchor
          size="sm"
          component="button"
          onClick={() =>
            notify.info(
              'Please contact your administrator.',
              'Restricted Access'
            )
          }
        >
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow={shadows.card} p="xl" mt="xl" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="Your email"
            required
            {...form.getInputProps('username')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <Group justify="space-between" mt="lg">
            <Checkbox label="Remember me" />
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </Anchor>
          </Group>
          <Button
            fullWidth
            mt="xl"
            type="submit"
            loading={loginMutation.isPending}
          >
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
