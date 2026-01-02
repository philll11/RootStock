import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, DataTable, Card, useTheme } from 'react-native-paper';
import { ResourceViewLayout, DetailRow } from '@rootstock/ui/mobile';
import { useGetAssessment, useDeleteAssessment } from '@rootstock/operations/assessments/assessments-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import dayjs from 'dayjs';
import { spacing } from '@rootstock/ui/theme';

export function AssessmentViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { can } = usePermission();
  const theme = useTheme();

  const handleEdit = () => {
    router.push(`/operations/assessments/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteAssessment(id!);
    router.back();
  };

  const blockId = typeof assessment?.blockId === 'object' ? assessment.blockId.recordId : assessment?.blockId;

  return (
    <ResourceViewLayout
      title="Assessment Details"
      isLoading={isLoading}
      error={!assessment}
      entityName="Assessment"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.ASSESSMENT_EDIT)}
      canDelete={can(PERMISSIONS.ASSESSMENT_DELETE)}
    >
      <DetailRow label="Date" value={assessment ? dayjs(assessment.date).format('MMM D, YYYY') : ''} />
      <DetailRow label="Block ID" value={blockId} />
      <DetailRow label="Status" value={assessment?.status} />
      <DetailRow label="Total Samples" value={assessment?.summary?.totalSamples} />
      <DetailRow label="Avg Damage" value={assessment ? `${assessment.summary.averageDamagePercentage}%` : ''} />

      <Text variant="titleMedium" style={styles.sectionTitle}>Samples</Text>
      
      <Card style={styles.card}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title numeric>Row</DataTable.Title>
            <DataTable.Title numeric>Total</DataTable.Title>
            <DataTable.Title numeric>Damaged</DataTable.Title>
          </DataTable.Header>

          {assessment?.samples?.map((sample, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell numeric>{sample.rowNumber}</DataTable.Cell>
              <DataTable.Cell numeric>{sample.totalFruit}</DataTable.Cell>
              <DataTable.Cell numeric>{sample.damagedFruit}</DataTable.Cell>
            </DataTable.Row>
          ))}
          {(!assessment?.samples || assessment.samples.length === 0) && (
             <View style={styles.emptyRow}>
               <Text variant="bodyMedium" style={styles.emptyText}>No samples recorded</Text>
             </View>
          )}
        </DataTable>
      </Card>
    </ResourceViewLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
  },
  emptyRow: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
  }
});