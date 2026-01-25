import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import OrchardForm from '../OrchardForm';
import { useCreateOrchard } from 'hooks/assets/useOrchards';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { OrchardFormData } from 'types/assets/orchard.schema';
import { CreateOrchardDto } from 'types/assets/orchard.types';

const OrchardCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/orchards');
    const { mutateAsync: createOrchard, isPending } = useCreateOrchard();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: OrchardFormData) => {
        try {
            const newOrchard = await createOrchard(values as CreateOrchardDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/orchards/${newOrchard._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Orchard">
            <OrchardForm
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

export default OrchardCreatePage;
