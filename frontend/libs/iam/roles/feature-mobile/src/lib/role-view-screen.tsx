import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useDeleteRole, useGetRole } from '@rootstock/iam/roles/roles-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const RoleViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteRole } = useDeleteRole();
  const { data: role, isLoading } = useGetRole(id);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Role',
      'Are you sure you want to delete this role?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRole(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  if (!role) return <Text>Role not found</Text>;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.ROLE_EDIT) ? (
              <Button onPress={() => router.push(`/iam/roles/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: role.name
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <DetailRow label="Name" value={role.name} />
        <DetailRow label="Description" value={role.description} />
        <DetailRow label="Status" value={role.isActive ? 'Active' : 'Inactive'} />
        <DetailRow label="Visibility Scope" value={role.visibilityScope} />
        
        <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          Permissions
        </Text>
        {role.permissions?.map((p: string) => (
          <Text key={p} variant="bodyMedium">• {p}</Text>
        ))}

        {can(PERMISSIONS.ROLE_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete Role
          </Button>
        )}
      </ScrollView>
    </>
  );
};
