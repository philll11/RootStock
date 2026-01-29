import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import BlockForm from '../BlockForm';
import { useCreateBlock } from 'hooks/assets/useBlocks';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { BlockFormData } from 'types/assets/block.schema';
import { CreateBlockDto } from 'types/assets/block.types';

const BlockCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/blocks');
    const { mutateAsync: createBlock, isPending } = useCreateBlock();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: BlockFormData) => {
        try {
            const newBlock = await createBlock(values as CreateBlockDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/blocks/${newBlock._id}`), 0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Block">
            <BlockForm
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

export default BlockCreatePage;
