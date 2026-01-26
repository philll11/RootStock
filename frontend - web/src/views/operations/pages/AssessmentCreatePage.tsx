import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import AssessmentForm from '../AssessmentForm';
import { useCreateAssessment } from 'hooks/operations/useAssessments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { AssessmentFormData } from 'types/operations/assessment.schema';
import { CreateAssessmentDto } from 'types/operations/assessment.types';

const AssessmentCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/assessments');
    const { mutateAsync: createAssessment, isPending } = useCreateAssessment();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: AssessmentFormData) => {
        try {
            const newAssessment = await createAssessment(values as CreateAssessmentDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/assessments/${newAssessment._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Assessment">
            <AssessmentForm
                mode="create"
                onSubmit={handleSubmit}
                isLoading={isPending}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default AssessmentCreatePage;
