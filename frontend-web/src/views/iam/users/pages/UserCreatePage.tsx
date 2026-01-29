import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import UserForm from '../UserForm';
import { useCreateUser } from 'hooks/iam/useUsers';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { UserFormData } from 'types/iam/user.schema';
import { CreateUserDto } from 'types/iam/user.types';

const UserCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/users');
    const { mutateAsync: createUser, isPending } = useCreateUser();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: UserFormData) => {
        try {
            const newUser = await createUser(values as CreateUserDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/users/${newUser._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create User">
            <UserForm
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

export default UserCreatePage;
