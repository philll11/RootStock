import { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import RoleForm from '../RoleForm';
import { useCreateRole } from 'hooks/iam/useRoles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { RoleFormData } from 'api/iam/role.schema';

const RoleCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/roles');
    const { mutateAsync: createRole, isPending } = useCreateRole();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: RoleFormData) => {
        try {
            const newRole = await createRole(values as any);
            setIsDirty(false); // Clear dirty state before navigating
                        // Use setTimeout to ensure state update processes before navigation (sometimes safer with blockers)
            setTimeout(() => transitionTo(`/roles/${newRole._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Role">
            <RoleForm
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

export default RoleCreatePage;
