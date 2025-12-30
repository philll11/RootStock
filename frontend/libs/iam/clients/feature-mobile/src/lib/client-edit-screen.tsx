import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUpdateClient, useGetClient } from '@rootstock/iam/clients/clients-data-access';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { ClientForm, ClientFormData } from './client-form';

export const ClientEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();
  const { data: client, isLoading } = useGetClient(id);

  const handleSubmit = async (data: ClientFormData) => {
    if (!id || !client) return;
    try {
      await updateClient({ 
        id, 
        data: { 
          ...data, 
          __v: client.__v 
        } 
      });
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  if (!client) return null;

  return (
    <ClientForm
      defaultValues={{
        name: client.name,
        isActive: client.isActive
      }}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      isEditMode={true}
    />
  );
};
