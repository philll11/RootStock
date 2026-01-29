import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import OrchardForm from '../OrchardForm';
import { useGetOrchard, useUpdateOrchard } from 'hooks/assets/useOrchards';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { OrchardFormData } from 'types/assets/orchard.schema';

const OrchardEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/orchards/${id}`);
    const { data: orchard, isLoading, error } = useGetOrchard(id!);
    const { mutateAsync: updateOrchard, isPending: isUpdating } = useUpdateOrchard();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: OrchardFormData) => {
        if (!orchard) return;
        try {
            await updateOrchard({ id: orchard._id, data: { ...values, __v: orchard.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!orchard) return <MainCard title="Error">Orchard not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading orchard</MainCard>;

    return (
        <MainCard title={`Edit Orchard: ${orchard.name}`}>
            <OrchardForm
                mode="edit"
                orchard={orchard}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default OrchardEditPage;
