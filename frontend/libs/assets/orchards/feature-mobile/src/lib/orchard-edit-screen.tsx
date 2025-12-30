import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useGetOrchard, useUpdateOrchard } from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm } from './orchard-form';

export function OrchardEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: orchard, isLoading, isError } = useGetOrchard(id!);
  const { mutateAsync: updateOrchard, isPending: isUpdating } = useUpdateOrchard();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !orchard) {
    return (
      <View style={styles.center}>
        <Text>Error loading orchard details</Text>
      </View>
    );
  }

  const defaultValues = {
    name: orchard.name,
    clientId:
      typeof orchard.clientId === 'string'
        ? orchard.clientId
        : orchard.clientId._id,
    userIds:
      orchard.userIds?.map((u) => (typeof u === 'string' ? u : u._id)) || [],
    isActive: orchard.isActive,
  };

  const handleSubmit = async (data: any) => {
    await updateOrchard({ id: id!, data });
    router.back();
  };

  return (
    <View style={styles.container}>
      <OrchardForm
        mode="edit"
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isUpdating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
