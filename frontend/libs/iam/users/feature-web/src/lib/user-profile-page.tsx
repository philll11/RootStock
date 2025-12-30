// frontend/libs/users/feature-web/src/lib/user-profile-page.tsx
import {
  TextInput,
  Button,
  Group,
  PasswordInput,
  Stack,
  Title,
  Paper,
  Container,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '@rootstock/iam/auth/auth-data-access';
import { useUsers, UpdateUserDto } from '@rootstock/iam/users/users-data-access';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '@rootstock/ui/web';
import { layout, shadows } from '@rootstock/ui/theme';

export function UserProfilePage() {
  const { user } = useAuth();
  const { updateUser, isUpdating } = useUsers();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Strongly typed pending state
  const [pendingValues, setPendingValues] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  } | null>(null);

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
    validate: {
      firstName: (value) =>
        value.trim().length < 1 ? 'First name is required' : null,
      lastName: (value) =>
        value.trim().length < 1 ? 'Last name is required' : null,
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) =>
        value && value.length < 6
          ? 'Password must be at least 6 characters'
          : null,
    },
  });

  useEffect(() => {
    if (user) {
      form.setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFormSubmit = (values: typeof form.values) => {
    if (values.password) {
      setPendingValues(values);
      setConfirmModalOpen(true);
    } else {
      executeUpdate(values);
    }
  };

  const executeUpdate = async (values: typeof form.values) => {
    if (!user) return;

    const updateData: UpdateUserDto = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
    };

    if (values.password) {
      updateData.password = values.password;
    }

    try {
      await updateUser({ id: user._id, data: updateData });
      form.setFieldValue('password', ''); // Clear password field on success
    } catch (error) {
      // Error handled by useUsers hook
    } finally {
      setConfirmModalOpen(false);
      setPendingValues(null);
    }
  };

  return (
    // Fixed: Use architectural container width (640px)
    <Container size={layout.container.sm} py="xl">
      <Paper shadow={shadows.card} p="xl" withBorder radius="md">
        <Title order={2} mb="lg">
          My Profile
        </Title>

        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="First Name"
                placeholder="John"
                withAsterisk
                {...form.getInputProps('firstName')}
              />
              <TextInput
                label="Last Name"
                placeholder="Doe"
                withAsterisk
                {...form.getInputProps('lastName')}
              />
            </Group>

            <TextInput
              label="Email"
              placeholder="john.doe@example.com"
              withAsterisk
              {...form.getInputProps('email')}
            />

            <Divider label="Change Password" labelPosition="center" my="sm" />

            <PasswordInput
              label="New Password"
              description="Leave blank to keep current password"
              placeholder="New secure password"
              {...form.getInputProps('password')}
            />

            <Group justify="flex-end" mt="xl">
              <Button type="submit" loading={isUpdating}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <ConfirmModal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => pendingValues && executeUpdate(pendingValues)}
        title="Update Password?"
        message="Are you sure you want to update your password? You will be required to log in again on all devices."
        confirmLabel="Update Password"
        confirmColor="brand"
      />
    </Container>
  );
}
