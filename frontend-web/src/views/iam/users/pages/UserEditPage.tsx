import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import UserForm from '../UserForm';
import { useGetUser, useUpdateUser } from 'hooks/iam/useUsers';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { UserFormData } from 'types/iam/user.schema';

const UserEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/users/${id}`);
    const { data: user, isLoading, error } = useGetUser(id!);
    const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: UserFormData) => {
        if (!user) return;
        try {
            await updateUser({ id: user._id, data: { ...values, __v: user.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!user) return <MainCard title="Error">User not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading user</MainCard>;

    return (
        <MainCard title={`Edit User: ${user.firstName} ${user.lastName}`}>
            <UserForm
                mode="edit"
                user={user}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default UserEditPage;
