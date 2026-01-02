import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetAssessments } from '@rootstock/operations/assessments/assessments-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import dayjs from 'dayjs';

export function AssessmentListScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const { data: assessments, isLoading } = useGetAssessments({ blockId });
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.ASSESSMENT_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filtering for now, matching Blocks pattern
  const filteredAssessments =
    assessments?.filter((a) =>
      a.recordId.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <ListLayout
      title="Assessments"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search assessments"
      emptyText="No assessments found"
      isEmpty={!isLoading && filteredAssessments.length === 0}
      onAdd={
        canCreate
          ? () =>
              router.push(
                blockId
                  ? `/operations/assessments/create?blockId=${blockId}`
                  : '/operations/assessments/create'
              )
          : undefined
      }
      onBack={blockId ? () => router.back() : undefined}
    >
      <FlatList
        data={filteredAssessments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOptimistic = (item as any).recordId === 'TEMP';
          return (
            <List.Item
              title={`Assessment - ${dayjs(item.date).format('MMM D, YYYY')}`}
              titleStyle={isOptimistic ? { opacity: 0.5 } : undefined}
              description={
                isOptimistic
                  ? 'Syncing...'
                  : `ID: ${item.recordId} • Samples: ${item.samples?.length || 0}`
              }
              descriptionStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isOptimistic ? 'cloud-upload' : 'clipboard-check-outline'}
                  color={isOptimistic ? theme.colors.outline : undefined}
                />
              )}
              right={(props) => (
                <View style={styles.statusContainer}>
                  <List.Icon {...props} icon="chevron-right" />
                </View>
              )}
              onPress={() => router.push(`/operations/assessments/${item._id}`)}
              style={[styles.listItem, isOptimistic && { opacity: 0.7 }]}
            />
          );
        }}
      />
    </ListLayout>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});
