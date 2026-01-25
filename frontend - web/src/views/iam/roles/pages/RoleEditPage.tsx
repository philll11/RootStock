import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import RoleForm from '../RoleForm';
import { useGetRole, useUpdateRole } from 'hooks/iam/useRoles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { RoleFormData } from 'types/iam/role.schema';
    
const RoleEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/roles/${id}`);
    const { data: role, isLoading, error } = useGetRole(id!);
    const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: RoleFormData) => {
        if (!role) return;
        try {
            // Append version for concurrency control
            await updateRole({ id: role._id, data: { ...values, __v: role.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!role) return <MainCard title="Error">Role not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading role</MainCard>;

    return (
        <MainCard title={`Edit Role: ${role.name}`}>
            <RoleForm
                mode="edit"
                role={role}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default RoleEditPage;
