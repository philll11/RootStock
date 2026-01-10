import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AssessmentForm } from './assessment-form';
import { useCreateAssessment, AssessmentFormData } from '@rootstock/operations/assessments/assessments-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';

export function AssessmentCreateScreen() {
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const { mutateAsync: createAssessment, isPending: isCreating } = useCreateAssessment();

  const handleSubmit = async (data: AssessmentFormData) => {
    await createAssessment({
      name: data.name,
      type: data.type!,
      blockId: data.blockId!,
      date: data.date,
      samples: data.samples,
    });
    router.back();
  };

  return (
    <ResourceCreateLayout title="New Assessment">
      <AssessmentForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
        blockId={blockId}
      />
    </ResourceCreateLayout>
  );
}
