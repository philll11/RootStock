import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetAssessments, AssessmentStatus } from '@/features/operations/assessments/data';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';
import { ResourceListLayout } from '@/components';
import { AppTheme } from '@/theme';
import { spacing, palette } from '@/theme';
import dayjs from 'dayjs';

export function AssessmentListScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const { data: assessments, isLoading, refetch, isRefetching } = useGetAssessments({ blockId });
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.ASSESSMENT_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filtering for now, matching Blocks pattern
  const filteredAssessments =
    assessments?.filter((a) =>
      a.recordId.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const getStatusColor = (status: AssessmentStatus) => {
    switch (status) {
      case AssessmentStatus.PENDING:
        return palette.status.pending;
      case AssessmentStatus.IN_PROGRESS:
        return palette.status.completed; // Blue
      case AssessmentStatus.COMPLETED:
        return palette.status.completed; // Green
      default:
        return palette.status.pending;
    }
  };

  return (
    <ResourceListLayout
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
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredAssessments}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOptimistic = (item as any).recordId === 'TEMP';
          const statusColor = getStatusColor(item.status);
          return (
            <List.Item
              title={`${item.name || 'Assessment'} - ${dayjs(item.date).format('MMM D, YYYY')}`}
              titleStyle={isOptimistic ? { opacity: 0.5 } : undefined}
              description={
                isOptimistic
                  ? 'Syncing...'
                  : `Type: ${item.type || 'N/A'} â€¢ ID: ${item.recordId} â€¢ Samples: ${item.samples?.length || 0}`
              }
              descriptionStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isOptimistic ? 'cloud-upload' : 'clipboard-check-outline'}
                  color={isOptimistic ? theme.colors.outline : statusColor}
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
    </ResourceListLayout>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});

