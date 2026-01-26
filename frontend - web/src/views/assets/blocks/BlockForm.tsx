import { useEffect, useState, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField, Grid, Autocomplete, Button, Box, Typography, Alert, IconButton, Paper, FormControlLabel, Switch } from '@mui/material';
import { IconTrash, IconPlus, IconHistory, IconClipboardCheck } from '@tabler/icons-react';

import { Block } from 'types/assets/block.types';
import { blockSchema, BlockFormData } from 'types/assets/block.schema';

import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';
import SubCard from 'ui-component/cards/SubCard';

import { useGetOrchards } from 'hooks/assets/useOrchards';
import { useGetVarieties } from 'hooks/master-data/useVarieties';
import AssessmentList from 'views/operations/AssessmentList';

export type BlockFormMode = 'create' | 'edit' | 'view';

interface BlockFormProps {
  mode: BlockFormMode;
  block?: Block | null;
  initialValues?: Partial<BlockFormData>;
  onSubmit: (values: BlockFormData) => void;
  isLoading?: boolean;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<BlockFormData>) => void;
  orchardId?: string; // Optional prop to pre-select orchard
}

const BlockForm = ({
  mode,
  block,
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  onDirtyChange,
  onValuesChange,
  orchardId
}: BlockFormProps) => {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { data: orchards = [], isLoading: isLoadingOrchards } = useGetOrchards();
  const { data: varieties = [], isLoading: isLoadingVarieties } = useGetVarieties();

  const { can } = usePermission();

  const [showReplantWarning, setShowReplantWarning] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors }
  } = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      name: '',
      orchardId: orchardId || '',
      plantings: [{ varietyId: '', treeCount: 0 }],
      isActive: true,
      __v: 0,
      ...initialValues
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'plantings'
  });

  // Keep a stable ref to the callback to avoid breaking debounce if prop changes referentially
  const onValuesChangeRef = useRef(onValuesChange);
  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);


  const debouncedOnValuesChange = useMemo(
    () =>
      debounce((val: Partial<BlockFormData>) => {
        if (onValuesChangeRef.current) {
          onValuesChangeRef.current(val);
        }
      }, 500),
    []
  );

  const watchedValues = watch();

  useEffect(() => {
    if (!onValuesChange) return;
    debouncedOnValuesChange(watchedValues as Partial<BlockFormData>);
  }, [watchedValues, debouncedOnValuesChange, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Replanting Warning Logic
  useEffect(() => {
    if (isEditing && block && watchedValues.plantings) {
      const hasChangedVariety = watchedValues.plantings.some((p, index) => {
        const initialP = block.plantings[index];
        if (!initialP) return false;

        const initialVarietyId = typeof initialP.varietyId === 'object' ? initialP.varietyId._id : initialP.varietyId;
        return p.varietyId && p.varietyId !== initialVarietyId;
      });
      setShowReplantWarning(hasChangedVariety);
    }
  }, [watchedValues.plantings, isEditing, block]);

  // Initialize Form Data
  useEffect(() => {
    if (block && (isEditing || isViewing)) {
      reset({
        name: block.name,
        orchardId: typeof block.orchardId === 'object' ? block.orchardId._id : block.orchardId,
        plantings: block.plantings.map((p) => ({
          varietyId: typeof p.varietyId === 'object' ? p.varietyId._id : p.varietyId,
          treeCount: p.treeCount,
          _id: p._id
        })),
        isActive: block.isActive,
        __v: block.__v
      });
    } else if (isCreating) {
      reset({
        name: initialValues?.name || '',
        orchardId: initialValues?.orchardId || orchardId || '',
        plantings: [{ varietyId: '', treeCount: 0 }],
        isActive: true,
        __v: 0,
        ...initialValues
      });
    }
  }, [block, mode, isEditing, isViewing, isCreating, orchardId, reset]);

  const handleFormSubmit = (values: BlockFormData) => {
    onSubmit(values);
  };

  const handleClear = () => {
    reset({
      name: '',
      orchardId: orchardId || '',
      plantings: [{ varietyId: '', treeCount: 0 }]
    });
  };

  const totalTrees = watchedValues.plantings?.reduce((sum, p) => sum + (Number(p.treeCount) || 0), 0) || 0;

  const tabs = useMemo(
    () => [
      {
        label: 'Assessments',
        value: 'assessments',
        icon: <IconClipboardCheck size="1.3rem" />,
        disabled: isCreating,
        component: block?._id ? <AssessmentList blockId={block._id} blockName={block.name} /> : null
      },
      {
        label: 'Audit Trail',
        value: 'audit',
        icon: <IconHistory size="1.3rem" />,
        disabled: isCreating,
        component: (
          <Box sx={{ mt: 2 }}>
            {block?._id ? (
              <ResourceAuditTable resource="Block" resourceId={block._id} />
            ) : (
              <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
            )}
          </Box>
        )
      }
    ],
    [block, isCreating]
  );

  const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Grid container spacing={3}>
        <Grid size={12}>
          <SubCard title="Block Details">
            <Grid container spacing={3}>
              <Grid size={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Block Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      disabled={isViewing}
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="orchardId"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <Autocomplete
                      {...field}
                      options={orchards}
                      getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      value={orchards.find((o) => o._id === value) || null}
                      onChange={(_, newValue) => onChange(newValue ? newValue._id : null)}
                      loading={isLoadingOrchards}
                      disabled={isViewing || !!orchardId}
                      renderInput={(params) => (
                        <TextField {...params} label="Orchard" error={!!errors.orchardId} helperText={errors.orchardId?.message} />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={12}>
          <SubCard title="Plantings (Inventory)" secondary={<Typography variant="subtitle2">Total Trees: {totalTrees}</Typography>}>
            {showReplantWarning && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Warning: Changing the variety of an existing planting will affect historical assessment records.
              </Alert>
            )}

            <Grid container spacing={2}>
              {fields.map((field, index) => (
                <Grid size={12} key={field.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={12}>
                        <Controller
                          name={`plantings.${index}.varietyId`}
                          control={control}
                          render={({ field: { onChange, value, ...field } }) => (
                            <Autocomplete
                              {...field}
                              options={varieties}
                              getOptionLabel={(option) => option.name}
                              isOptionEqualToValue={(option, value) => option._id === value._id}
                              value={varieties.find((v) => v._id === value) || null}
                              onChange={(_, newValue) => onChange(newValue ? newValue._id : '')}
                              loading={isLoadingVarieties}
                              disabled={isViewing}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Variety"
                                  error={!!errors.plantings?.[index]?.varietyId}
                                  helperText={errors.plantings?.[index]?.varietyId?.message}
                                />
                              )}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={6}>
                        <Controller
                          name={`plantings.${index}.treeCount`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              type="number"
                              label="Tree Count"
                              error={!!errors.plantings?.[index]?.treeCount}
                              helperText={errors.plantings?.[index]?.treeCount?.message}
                              disabled={isViewing}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />
                      </Grid>
                      {!isViewing && (
                        <Grid size={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <IconButton color="error" onClick={() => remove(index)} disabled={fields.length === 1}>
                            <IconTrash />
                          </IconButton>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {!isViewing && (
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" startIcon={<IconPlus />} onClick={() => append({ varietyId: '', treeCount: 0 })}>
                  Add Planting
                </Button>
              </Box>
            )}
          </SubCard>
        </Grid>

        {!isCreating && can(PERMISSIONS.BLOCK_MANAGE_INACTIVE) && (
          <Grid size={12}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Active" disabled={isViewing} />
              )}
            />
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <ResourceRelatedTabs tabs={tabs} />
      </Box>

      {/* Buttons (Hidden in View mode if strictly viewing, or you might want an Edit button) */}
      {!isViewing && (
        <Box sx={{ mt: 3 }}>
          <Grid container>
            <Grid size={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                {isCreating ? (
                  <Button variant="text" color="error" onClick={() => handleClear()}>
                    Clear
                  </Button>
                ) : (
                  <Box />
                )}

                <Box display="flex" gap={2}>
                  <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={isSubmitDisabled}>
                    {isEditing ? 'Update Block' : 'Create Block'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </form>
  );
};

export default BlockForm;
