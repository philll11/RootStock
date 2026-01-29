import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import AssessmentForm from '../AssessmentForm';
import { useGetAssessment, useUpdateAssessment } from 'hooks/operations/useAssessments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { AssessmentFormData } from 'types/operations/assessment.schema';

const AssessmentEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/assessments/${id}`);
    const { data: assessment, isLoading, error } = useGetAssessment(id!);
    const { mutateAsync: updateAssessment, isPending: isUpdating } = useUpdateAssessment();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: AssessmentFormData) => {
        if (!assessment) return;
        try {
            await updateAssessment({ id: assessment._id, data: { ...values, __v: assessment.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!assessment) return <MainCard title="Error">Assessment not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading assessment</MainCard>;

    return (
        <MainCard title={`Edit Assessment: ${assessment.name}`}>
            <AssessmentForm
                mode="edit"
                assessment={assessment}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default AssessmentEditPage;
