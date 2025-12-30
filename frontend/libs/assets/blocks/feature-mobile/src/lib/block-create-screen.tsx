import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { BlockForm } from './block-form';

export function BlockCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();

  const handleSubmit = async (data: any) => {
    const { isActive, ...createData } = data;
    await createBlock(createData);
    router.back();
  };

  return (
    <View style={styles.container}>
      <BlockForm
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
