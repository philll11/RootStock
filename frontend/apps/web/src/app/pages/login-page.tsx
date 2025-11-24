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
import { useLogin } from '@rootstock/core';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length < 1 ? 'Username is required' : null),
      password: (value) => (value.length < 1 ? 'Password is required' : null),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        // Navigate to dashboard on success
        navigate('/');
      },
      onError: (error) => {
        // In a real app, show a notification
        console.error('Login failed:', error);
        form.setErrors({ password: 'Invalid username or password' });
      }
    });
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" className="font-grey-900">
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component="button">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput 
            label="Username" 
            placeholder="Your username" 
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
            <Anchor component="button" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          <Button fullWidth mt="xl" type="submit" loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
