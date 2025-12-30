import React from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme, List } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useGetBlock, useDeleteBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function BlockViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteBlock } = useDeleteBlock();
  const { data: block, isLoading } = useGetBlock(id!);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Block',
      'Are you sure you want to delete this block?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBlock(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!block) {
    return (
      <View style={styles.centerContainer}>
        <Text>Block not found</Text>
      </View>
    );
  }

  const orchardName = typeof block.orchardId === 'object' ? (block.orchardId as any).name : 'Unknown Orchard';

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.BLOCK_EDIT) ? (
              <Button onPress={() => router.push(`/assets/blocks/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: block.name
        }}
      />
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <DetailRow label="Name" value={block.name} />
        <DetailRow label="Orchard" value={orchardName} />
        <DetailRow label="Status" value={block.isActive ? 'Active' : 'Inactive'} />
        
        <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          Plantings
        </Text>
        <View style={styles.plantingsContainer}>
          {block.plantings?.map((planting: any, index: number) => {
            const varietyName = typeof planting.varietyId === 'object' ? planting.varietyId.name : 'Unknown Variety';
            return (
              <List.Item
                key={index}
                title={varietyName}
                description={`${planting.treeCount} trees`}
                left={props => <List.Icon {...props} icon="tree" />}
                style={styles.plantingItem}
              />
            );
          })}
          {(!block.plantings || block.plantings.length === 0) && (
            <Text variant="bodyMedium">No plantings recorded</Text>
          )}
        </View>

        {can(PERMISSIONS.BLOCK_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete Block
          </Button>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  plantingsContainer: {
    marginTop: spacing.xs,
  },
  plantingItem: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});
