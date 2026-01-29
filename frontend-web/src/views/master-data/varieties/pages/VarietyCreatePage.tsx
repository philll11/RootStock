import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import VarietyForm from '../VarietyForm';
import { useCreateVariety } from 'hooks/master-data/useVarieties';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { VarietyFormData } from 'types/master-data/variety.schema';
import { CreateVarietyDto } from 'types/master-data/variety.types';

const VarietyCreatePage = () => {
  const { goBack, transitionTo } = useContextualNavigation('/varieties');
  const { mutateAsync: createVariety, isPending } = useCreateVariety();
  const [isDirty, setIsDirty] = useState(false);

  // Prompt before leaving if dirty
  const { discardDialogProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: VarietyFormData) => {
    try {
      const newVariety = await createVariety(values as CreateVarietyDto);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/varieties/${newVariety._id}`), 0);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainCard title="Create Variety">
      <VarietyForm mode="create" onSubmit={handleSubmit} isLoading={isPending} onCancel={() => goBack()} onDirtyChange={setIsDirty} />
      <ConfirmDialog {...discardDialogProps} />
    </MainCard>
  );
};

export default VarietyCreatePage;
