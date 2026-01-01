import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, useTheme, DataTable, Card } from 'react-native-paper';
import { ResourceViewLayout } from '@rootstock/ui/mobile';
import { useGetAssessment, useDeleteAssessment } from '@rootstock/operations/assessments/assessments-data-access';
import { format } from 'date-fns';
import { spacing } from '@rootstock/ui/theme';

export function AssessmentViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const deleteAssessment = useDeleteAssessment();

  const handleEdit = () => {
    router.push(`/operations/assessments/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteAssessment.mutateAsync(id!);
    router.back();
  };

  if (!assessment && !isLoading) {
    return (
      <View style={styles.center}>
        <Text>Assessment not found</Text>
      </View>
    );
  }

  return (
    <ResourceViewLayout
      title="Assessment Details"
      isLoading={isLoading}
      onEdit={handleEdit}
      onDelete={handleDelete}
      deleteTitle="Delete Assessment"
      deleteMessage="Are you sure you want to delete this assessment? This action cannot be undone."
    >
      {assessment && (
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <Text variant="labelMedium" style={styles.label}>Date:</Text>
                <Text variant="bodyMedium">{format(new Date(assessment.date), 'PP')}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="labelMedium" style={styles.label}>Block ID:</Text>
                <Text variant="bodyMedium">{assessment.blockId}</Text>
              </View>
            </Card.Content>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>Samples</Text>
          
          <Card style={styles.card}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title numeric>Row</DataTable.Title>
                <DataTable.Title numeric>Total</DataTable.Title>
                <DataTable.Title numeric>Damaged</DataTable.Title>
              </DataTable.Header>

              {assessment.samples?.map((sample, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell numeric>{sample.rowNumber}</DataTable.Cell>
                  <DataTable.Cell numeric>{sample.totalFruit}</DataTable.Cell>
                  <DataTable.Cell numeric>{sample.damagedFruit}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        </View>
      )}
    </ResourceViewLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
});
