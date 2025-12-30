import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, FAB } from 'react-native-paper';
import { useBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { BlockForm } from './block-form';

export function BlockViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { block, isLoading, isError } = useBlock(id!);
  const { can } = usePermission();

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

  const canEdit = can(PERMISSIONS.BLOCK_EDIT);

  return (
    <View style={styles.container}>
      <BlockForm
        mode="view"
        defaultValues={defaultValues}
        onSubmit={async () => {}}
        onCancel={() => router.back()}
      />
      {canEdit && (
        <FAB
          icon="pencil"
          style={styles.fab}
          onPress={() => router.push(`/assets/blocks/edit?id=${id}`)}
        />
      )}
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
