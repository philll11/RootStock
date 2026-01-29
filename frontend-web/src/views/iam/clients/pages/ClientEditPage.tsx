import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetClient, useUpdateClient } from 'hooks/iam/useClients';
import ClientForm from '../ClientForm';
import MainCard from 'ui-component/cards/MainCard';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import { ClientFormData } from 'types/iam/client.schema';

const ClientEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/clients/${id}`);
    const { data: client, isLoading, error } = useGetClient(id!);
    const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: ClientFormData) => {
        if (!client) return;
        try {
            const { subsidiaryId, ...updateData } = values;
            await updateClient({ id: client._id, data: { ...updateData, __v: client.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!client) return <MainCard title="Error">Client not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading client</MainCard>;

    return (
        <MainCard title={`Edit Client: ${client.name}`}>
            <ClientForm
                mode="edit"
                client={client}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
             <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default ClientEditPage;
