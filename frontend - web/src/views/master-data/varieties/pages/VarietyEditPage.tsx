import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import VarietyForm from '../VarietyForm';
import { useGetVariety, useUpdateVariety } from 'hooks/master-data/useVarieties';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { VarietyFormData } from 'types/master-data/variety.schema';

const VarietyEditPage = () => {
  const { id } = useParams();
  const { goBack } = useContextualNavigation(`/varieties/${id}`);
  const { data: variety, isLoading, error } = useGetVariety(id!);
  const { mutateAsync: updateVariety, isPending: isUpdating } = useUpdateVariety();
  const [isDirty, setIsDirty] = useState(false);

  const { discardDialogProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: VarietyFormData) => {
    if (!variety) return;
    try {
      await updateVariety({ id: variety._id, data: { ...values, __v: variety.__v } });
      setIsDirty(false);
      setTimeout(() => goBack(), 0);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
  if (!variety) return <MainCard title="Error">Variety not found</MainCard>;
  if (error) return <MainCard title="Error">Error loading variety</MainCard>;

  return (
    <MainCard title={`Edit Variety: ${variety.name}`}>
      <VarietyForm
        mode="edit"
        variety={variety}
        onSubmit={handleSubmit}
        isLoading={isUpdating}
        onCancel={() => goBack()}
        onDirtyChange={setIsDirty}
      />
      <ConfirmDialog {...discardDialogProps} />
    </MainCard>
  );
};

export default VarietyEditPage;
