import { TextInput, Button, Group, PasswordInput, Stack, Title, Paper, Container, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '@rootstock/auth/data-access';
import { useUsers } from '@rootstock/users/data-access';
import { useEffect, useState } from 'react';
import { notify } from '@rootstock/shared/util';
import { ConfirmModal } from '@rootstock/ui/web';

export function UserProfilePage() {
  const { user } = useAuth();
  const { updateUser, isUpdating } = useUsers();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<typeof form.values | null>(null);

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
    validate: {
      firstName: (value) => (value.trim().length < 1 ? 'First name is required' : null),
      lastName: (value) => (value.trim().length < 1 ? 'Last name is required' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value && value.length < 6 ? 'Password must be at least 6 characters' : null),
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

    const updateData: any = {
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
      // Error handled by useUsers
    } finally {
      setConfirmModalOpen(false);
      setPendingValues(null);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="xs" p="xl" withBorder>
        <Title order={2} mb="lg">My Profile</Title>
        
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="First Name"
                placeholder="John"
                {...form.getInputProps('firstName')}
              />
              <TextInput
                label="Last Name"
                placeholder="Doe"
                {...form.getInputProps('lastName')}
              />
            </Group>
            
            <TextInput
              label="Email"
              placeholder="john.doe@example.com"
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
        confirmColor="blue"
      />
    </Container>
  );
}
