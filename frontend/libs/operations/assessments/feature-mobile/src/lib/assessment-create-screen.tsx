import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { AssessmentForm, AssessmentFormData } from './assessment-form';
import { useCreateAssessment } from '@rootstock/operations/assessments/assessments-data-access';

export function AssessmentCreateScreen() {
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const createAssessment = useCreateAssessment();

  const handleSubmit = async (data: AssessmentFormData) => {
    await createAssessment.mutateAsync({
      ...data,
      blockId: blockId!,
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="New Assessment" />
      </Appbar.Header>
      <AssessmentForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={createAssessment.isPending}
        blockId={blockId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
