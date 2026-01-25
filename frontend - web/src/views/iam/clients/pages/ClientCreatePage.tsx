import { useState } from 'react';
import { useCreateClient } from 'hooks/iam/useClients';
import ClientForm from '../ClientForm';
import MainCard from 'ui-component/cards/MainCard';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import { ClientFormData } from 'types/iam/client.schema';
import { CreateClientDto } from 'types/iam/client.types';

const ClientCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/clients');
    const { mutateAsync: createClient, isPending } = useCreateClient();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: ClientFormData) => {
        try {
            const newClient = await createClient(values as CreateClientDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/clients/${newClient._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Client">
            <ClientForm
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

export default ClientCreatePage;
