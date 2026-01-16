import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, DataTable, Card, useTheme, Button, TextInput, HelperText, Portal, Modal } from 'react-native-paper';
import { ResourceViewLayout, DetailRow, DataEntryWizard, AppTheme } from '@rootstock/ui/mobile';
import { useGetAssessment, useDeleteAssessment, useUpdateAssessment, useReopenAssessment, AssessmentStatus } from '@rootstock/operations/assessments/assessments-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import dayjs from 'dayjs';
import { spacing } from '@rootstock/ui/theme';

export function AssessmentViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: assessment, isLoading, refetch, isRefetching } = useGetAssessment(id!);
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { mutateAsync: updateAssessment } = useUpdateAssessment();
  const { reopenAssessment } = useReopenAssessment();
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState({ totalFruit: '', damagedFruit: '' });
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

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

  const handleFinalize = async () => {
    if (!assessment) return;
    Alert.alert(
      'Finalize Assessment',
      'Are you sure you want to finalize this assessment? It will be locked and cannot be edited without reopening.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize',
          onPress: async () => {
            await updateAssessment({
              id: id!,
              data: { status: AssessmentStatus.COMPLETED, __v: assessment.__v },
            });
          },
        },
      ]
    );
  };

  const handleReopen = async () => {
    if (!assessment || !reopenReason.trim()) return;
    await reopenAssessment(assessment._id, reopenReason, assessment.__v);
    setReopenReason('');
    setIsReopenModalOpen(false);
  };

  const blockId = typeof assessment?.blockId === 'object' ? assessment.blockId.recordId : assessment?.blockId;
  const isCompleted = assessment?.status === AssessmentStatus.COMPLETED;

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

      <Portal>
        <Modal visible={isReopenModalOpen} onDismiss={() => setIsReopenModalOpen(false)} contentContainerStyle={styles.modalContainer}>
          <Text variant="titleLarge" style={{ marginBottom: spacing.md }}>Reopen Assessment</Text>
          <TextInput
            label="Reason for Reopening"
            value={reopenReason}
            onChangeText={setReopenReason}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ marginBottom: spacing.md }}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setIsReopenModalOpen(false)} style={{ marginRight: spacing.sm }}>Cancel</Button>
            <Button mode="contained" onPress={handleReopen} disabled={!reopenReason.trim()}>Reopen</Button>
          </View>
        </Modal>
      </Portal>

      <ResourceViewLayout
        title="Assessment Details"
        isLoading={isLoading}
        error={!assessment}
        entityName="Assessment"
        onEdit={!isCompleted ? handleEdit : undefined}
        onDelete={!isCompleted ? handleDelete : undefined}
        canEdit={can(PERMISSIONS.ASSESSMENT_EDIT)}
        canDelete={can(PERMISSIONS.ASSESSMENT_DELETE)}
        onRefresh={refetch}
        isRefreshing={isRefetching}
      >
        <DetailRow label="Name" value={assessment?.name} />
        <DetailRow label="Type" value={assessment?.type} />
        <DetailRow label="Date" value={assessment ? dayjs(assessment.date).format('MMM D, YYYY') : ''} />
        <DetailRow label="Block ID" value={blockId} />
        <DetailRow label="Status" value={assessment?.status} />
        
        {assessment?.summary && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={{ marginBottom: 8, color: theme.colors.outline }}>
              Summary
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Samples</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{assessment.summary.totalSamples}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Total Fruit</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{assessment.summary.totalFruit}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Damaged</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{assessment.summary.totalDamaged}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Damage %</Text>
                <Text 
                  variant="bodyMedium" 
                  style={{ 
                    fontWeight: 'bold', 
                    color: assessment.summary.averageDamagePercentage > 0 ? theme.colors.error : theme.colors.onSurface 
                  }}
                >
                  {assessment.summary.averageDamagePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium">Samples</Text>
          {!isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) && (
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

        <View style={{ height: 80 }} />
      </ResourceViewLayout>

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface }]}>
        {!isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) && (
          <Button mode="contained" onPress={handleFinalize} style={styles.actionButton}>Finalize Assessment</Button>
        )}
        {isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) && (
          <Button mode="outlined" onPress={() => setIsReopenModalOpen(true)} style={styles.actionButton}>Reopen</Button>
        )}
      </View>
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
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    width: '100%',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  section: {
    marginTop: spacing.md,
  },
  summaryItem: {
    padding: 8, 
    borderRadius: 8, 
    flexGrow: 1, 
    minWidth: '22%',
    alignItems: 'center'
  },
});