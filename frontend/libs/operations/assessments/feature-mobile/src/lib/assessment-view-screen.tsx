import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, DataTable, Card, useTheme, Button, TextInput, HelperText } from 'react-native-paper';
import { ResourceViewLayout, DetailRow, DataEntryWizard, AppTheme } from '@rootstock/ui/mobile';
import { useGetAssessment, useDeleteAssessment, useUpdateAssessment } from '@rootstock/operations/assessments/assessments-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import dayjs from 'dayjs';
import { spacing } from '@rootstock/ui/theme';

export function AssessmentViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { mutateAsync: updateAssessment } = useUpdateAssessment();
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState({ totalFruit: '', damagedFruit: '' });

  const handleEdit = () => {
    router.push(`/operations/assessments/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteAssessment(id!);
    router.back();
  };

  const handleWizardSave = async () => {
    if (!assessment) return;
    
    const total = parseInt(wizardData.totalFruit) || 0;
    const damaged = parseInt(wizardData.damagedFruit) || 0;

    const newSamples = [
      ...(assessment.samples || []),
      {
        rowNumber: 0, // Placeholder, will be re-indexed
        totalFruit: total,
        damagedFruit: damaged,
      }
    ].map((sample, index) => ({ ...sample, rowNumber: index + 1 }));

    await updateAssessment({
      id: id!,
      data: {
        samples: newSamples,
        __v: assessment.__v,
      },
    });

    setWizardData({ totalFruit: '', damagedFruit: '' });
  };

  const handleWizardFinish = async () => {
    const hasData = wizardData.totalFruit !== '' || wizardData.damagedFruit !== '';

    if (hasData) {
      Alert.alert(
        'Unsaved Changes',
        'You have entered data for a sample. Do you want to save it before finishing?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setWizardData({ totalFruit: '', damagedFruit: '' });
              setIsWizardOpen(false);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleWizardSave();
              setIsWizardOpen(false);
            },
          },
        ]
      );
    } else {
      setIsWizardOpen(false);
    }
  };

  const blockId = typeof assessment?.blockId === 'object' ? assessment.blockId.recordId : assessment?.blockId;

  return (
    <>
      <DataEntryWizard
        visible={isWizardOpen}
        title="Record Sample"
        itemNumber={(assessment?.samples?.length || 0) + 1}
        onSaveAndNext={handleWizardSave}
        onSaveAndFinish={handleWizardFinish}
        onCancel={() => setIsWizardOpen(false)}
      >
        <TextInput
          label="Total Fruit"
          value={wizardData.totalFruit}
          onChangeText={(val) => setWizardData((prev) => ({ ...prev, totalFruit: val }))}
          keyboardType="number-pad"
          mode="outlined"
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Damaged Fruit"
          value={wizardData.damagedFruit}
          onChangeText={(val) => setWizardData((prev) => ({ ...prev, damagedFruit: val }))}
          keyboardType="number-pad"
          mode="outlined"
          error={(parseInt(wizardData.damagedFruit) || 0) > (parseInt(wizardData.totalFruit) || 0)}
        />
        {(parseInt(wizardData.damagedFruit) || 0) > (parseInt(wizardData.totalFruit) || 0) && (
          <HelperText type="error" visible>
            Damaged fruit cannot exceed total fruit.
          </HelperText>
        )}
      </DataEntryWizard>

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

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">Samples</Text>
        {can(PERMISSIONS.ASSESSMENT_EDIT) && (
          <Button mode="contained-tonal" onPress={() => setIsWizardOpen(true)} icon="plus">
            Record Samples
          </Button>
        )}
      </View>
      
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
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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