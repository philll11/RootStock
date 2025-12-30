import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useClients, useClient } from '@rootstock/iam/clients/clients-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const ClientViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteClient } = useClients();
  const { data: client, isLoading } = useClient(id);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteClient(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  if (!client) return <Text>Client not found</Text>;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.CLIENT_EDIT) ? (
              <Button onPress={() => router.push(`/iam/clients/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: client.name
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <DetailRow label="Name" value={client.name} />
        <DetailRow label="Status" value={client.isActive ? 'Active' : 'Inactive'} />
        
        {can(PERMISSIONS.CLIENT_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete Client
          </Button>
        )}
      </ScrollView>
    </>
  );
};
