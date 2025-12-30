import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="iam/roles/index" options={{ title: 'Roles', headerShown: false }} />
      <Stack.Screen name="iam/roles/create" options={{ title: 'Create Role', headerShown: true }} />
      <Stack.Screen name="iam/roles/[id]" options={{ title: 'Role Details', headerShown: true }} />
      <Stack.Screen name="iam/roles/edit" options={{ title: 'Edit Role', headerShown: true }} />

      <Stack.Screen name="iam/clients/index" options={{ title: 'Clients', headerShown: false }} />
      <Stack.Screen name="iam/clients/create" options={{ title: 'Create Client', headerShown: true }} />
      <Stack.Screen name="iam/clients/[id]" options={{ title: 'Client Details', headerShown: true }} />
      <Stack.Screen name="iam/clients/edit" options={{ title: 'Edit Client', headerShown: true }} />
    </Stack>
  );
}
