import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useGetBlock, useUpdateBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { BlockForm } from './block-form';

export function BlockEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: block, isLoading, isError } = useGetBlock(id!);
  const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !block) {
    return (
      <View style={styles.center}>
        <Text>Error loading block details</Text>
      </View>
    );
  }

  const defaultValues = {
    name: block.name,
    orchardId:
      typeof block.orchardId === 'string'
        ? block.orchardId
        : block.orchardId._id,
    plantings:
      block.plantings?.map((p) => ({
        varietyId:
          typeof p.varietyId === 'string' ? p.varietyId : p.varietyId._id,
        treeCount: p.treeCount,
      })) || [],
    isActive: block.isActive,
  };

  const handleSubmit = async (data: any) => {
    await updateBlock({ id: id!, data });
    router.back();
  };

  return (
    <View style={styles.container}>
      <BlockForm
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
