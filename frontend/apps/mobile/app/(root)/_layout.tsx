import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.onBackground,
    }}>
      <Stack.Screen name="iam/roles/index" options={{ title: 'Roles', headerShown: false }} />
      <Stack.Screen name="iam/roles/create" options={{ title: 'Create Role', headerShown: true }} />
      <Stack.Screen name="iam/roles/[id]" options={{ title: 'Role Details', headerShown: true }} />
      <Stack.Screen name="iam/roles/edit" options={{ title: 'Edit Role', headerShown: true }} />

      <Stack.Screen name="iam/users/index" options={{ title: 'Users', headerShown: false }} />
      <Stack.Screen name="iam/users/create" options={{ title: 'Create User', headerShown: true }} />
      <Stack.Screen name="iam/users/[id]" options={{ title: 'User Details', headerShown: true }} />
      <Stack.Screen name="iam/users/edit" options={{ title: 'Edit User', headerShown: true }} />

      <Stack.Screen name="iam/clients/index" options={{ title: 'Clients', headerShown: false }} />
      <Stack.Screen name="iam/clients/create" options={{ title: 'Create Client', headerShown: true }} />
      <Stack.Screen name="iam/clients/[id]" options={{ title: 'Client Details', headerShown: true }} />
      <Stack.Screen name="iam/clients/edit" options={{ title: 'Edit Client', headerShown: true }} />

      <Stack.Screen name="master-data/varieties/index" options={{ title: 'Varieties', headerShown: false }} />
      <Stack.Screen name="master-data/varieties/create" options={{ title: 'Create Variety', headerShown: true }} />
      <Stack.Screen name="master-data/varieties/[id]" options={{ title: 'Variety Details', headerShown: true }} />
      <Stack.Screen name="master-data/varieties/edit" options={{ title: 'Edit Variety', headerShown: true }} />

      <Stack.Screen name="assets/orchards/index" options={{ title: 'Orchards', headerShown: false }} />
      <Stack.Screen name="assets/orchards/create" options={{ title: 'Create Orchard', headerShown: true }} />
      <Stack.Screen name="assets/orchards/[id]" options={{ title: 'Orchard Details', headerShown: true }} />
      <Stack.Screen name="assets/orchards/edit" options={{ title: 'Edit Orchard', headerShown: true }} />

      <Stack.Screen name="assets/blocks/index" options={{ title: 'Blocks', headerShown: false }} />
      <Stack.Screen name="assets/blocks/create" options={{ title: 'Create Block', headerShown: true }} />
      <Stack.Screen name="assets/blocks/[id]" options={{ title: 'Block Details', headerShown: true }} />
      <Stack.Screen name="assets/blocks/edit" options={{ title: 'Edit Block', headerShown: true }} />
    </Stack>
  );
}
