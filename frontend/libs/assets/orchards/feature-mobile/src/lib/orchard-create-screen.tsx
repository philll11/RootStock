import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrchards } from '@rootstock/orchards/orchards-data-access';
import { OrchardForm } from './orchard-form';

export function OrchardCreateScreen() {
  const router = useRouter();
  const { createOrchard, isCreating } = useOrchards();

  const handleSubmit = async (data: any) => {
    // Exclude isActive from creation payload
    const { isActive, ...createData } = data;
    await createOrchard(createData);
    router.back();
  };

  return (
    <View style={styles.container}>
      <OrchardForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
