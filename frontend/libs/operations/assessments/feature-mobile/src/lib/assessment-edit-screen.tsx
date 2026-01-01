import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Appbar, ActivityIndicator } from 'react-native-paper';
import { AssessmentForm, AssessmentFormData } from './assessment-form';
import { useGetAssessment, useUpdateAssessment } from '@rootstock/operations/assessments/assessments-data-access';

export function AssessmentEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const updateAssessment = useUpdateAssessment();

  const handleSubmit = async (data: AssessmentFormData) => {
    if (!assessment) return;
    await updateAssessment.mutateAsync({
      id: id!,
      dto: { 
        date: data.date,
        samples: data.samples,
        __v: assessment.__v 
      },
    });
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Assessment" />
      </Appbar.Header>
      {assessment && (
        <AssessmentForm
          mode="edit"
          defaultValues={{
            date: new Date(assessment.date),
            samples: assessment.samples,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={updateAssessment.isPending}
          blockId={typeof assessment.blockId === 'object' ? assessment.blockId._id : assessment.blockId}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
