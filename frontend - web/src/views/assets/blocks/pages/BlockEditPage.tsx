import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import BlockForm from '../BlockForm';
import { useGetBlock, useUpdateBlock } from 'hooks/assets/useBlocks';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { BlockFormData } from 'types/assets/block.schema';

const BlockEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/blocks/${id}`);
    const { data: block, isLoading, error } = useGetBlock(id!);
    const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: BlockFormData) => {
        if (!block) return;
        try {
            await updateBlock({ id: block._id, data: { ...values, __v: block.__v } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!block) return <MainCard title="Error">Block not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading block</MainCard>;

    return (
        <MainCard title={`Edit Block: ${block.name}`}>
            <BlockForm
                mode="edit"
                block={block}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default BlockEditPage;
