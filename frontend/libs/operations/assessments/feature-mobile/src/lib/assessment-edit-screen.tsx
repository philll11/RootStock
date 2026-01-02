import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AssessmentForm } from './assessment-form';
import { useGetAssessment, useUpdateAssessment, AssessmentFormData } from '@rootstock/operations/assessments/assessments-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';

export function AssessmentEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: assessment, isLoading, isError } = useGetAssessment(id!);
  const { mutateAsync: updateAssessment, isPending: isUpdating } = useUpdateAssessment();

  const defaultValues = assessment ? {
    date: new Date(assessment.date),
    samples: assessment.samples,
    status: assessment.status,
    blockId: typeof assessment.blockId === 'object' ? assessment.blockId._id : assessment.blockId,
  } : undefined;

  const handleSubmit = async (data: AssessmentFormData) => {
    if (!assessment) return;
    await updateAssessment({
      id: id!,
      data: { 
        date: data.date,
        samples: data.samples,
        status: data.status,
        __v: assessment.__v 
      },
    });
    router.back();
  };

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={isError || !assessment}
      title="Edit Assessment"
    >
      {assessment && (
        <AssessmentForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isUpdating}
          blockId={typeof assessment.blockId === 'object' ? assessment.blockId._id : assessment.blockId}
        />
      )}
    </ResourceEditLayout>
  );
}
