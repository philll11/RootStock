import { useEffect, useMemo } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField, Button, FormControlLabel, Switch, Box, Grid, Typography } from '@mui/material';
import { IconHistory, IconTrees } from '@tabler/icons-react';

// Project Imports
import { Client } from 'types/iam/client.types';
import { clientSchema, ClientFormData } from 'api/iam/client.schema';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

export type ClientFormMode = 'create' | 'edit' | 'view';

interface ClientFormProps {
  mode: ClientFormMode;
  client?: Client | null;
  initialValues?: Partial<ClientFormData>;
  onSubmit: (values: ClientFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<ClientFormData>) => void;
}

const ClientForm = ({
  mode,
  client,
  initialValues,
  onSubmit,
  isLoading,
  onCancel,
  onDirtyChange,
  onValuesChange,
}: ClientFormProps) => {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      isActive: true,
      __v: 0,
      ...initialValues,
    },
  });

  // Create a debounced version of the change handler
  const debouncedOnValuesChange = useMemo(
    () =>
      debounce((val: Partial<ClientFormData>) => {
        if (onValuesChange) {
          onValuesChange(val);
        }
      }, 500),
    [onValuesChange]
  );

  // Watch for changes and notify parent
  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = watch((value) => {
      debouncedOnValuesChange(value as Partial<ClientFormData>);
    });
    return () => {
      subscription.unsubscribe();
      debouncedOnValuesChange.cancel();
    };
  }, [watch, debouncedOnValuesChange, onValuesChange]);

  // Notify parent about dirty state
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Initialize form with data
  useEffect(() => {
    if (client && (isEditing || isViewing)) {
      reset({
        name: client.name,
        isActive: client.isActive,
        __v: client.__v,
      });
    } else if (isCreating) {
      // Only reset to initialValues when mode switches to create, 
      // ignoring ongoing updates to initialValues (draft state)
      reset({
        name: initialValues?.name || '',
        isActive: true,
        __v: 0,
        ...initialValues
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, mode, isEditing, isViewing, isCreating, reset]);

  const handleFormSubmit = (values: ClientFormData) => {
    const submissionData: any = { ...values };
    if (isEditing && client) {
      submissionData.__v = client.__v;
    }
    if (isCreating) {
      delete submissionData.isActive; // Server handles defaults usually, or passing it is fine
      delete submissionData.__v;
    }
    onSubmit(submissionData as ClientFormData);
  };

  const handleClear = () => {
    reset({ name: '', isActive: true, __v: 0 });
  };

  const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;

  // Define tabs
  const tabs = useMemo(() => [
    {
      label: 'Orchards',
      value: 'orchards',
      icon: <IconTrees size="1.3rem" />,
      component: <div>Orchards related to this client will be displayed here.</div>
    },
    {
      label: 'Audit Trail',
      value: 'audit',
      icon: <IconHistory size="1.3rem" />,
      disabled: isCreating,
      component: (
        <Box sx={{ mt: 2 }}>
          {client?._id ? (
            <ResourceAuditTable resource="Client" resourceId={client._id} />
          ) : (
            <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
          )}
        </Box>
      )
    }
  ], [client, isCreating]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>

        {!isCreating && can(PERMISSIONS.CLIENT_MANAGE_INACTIVE) && (
          <Grid size={12}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Active"
                  disabled={isViewing}
                />
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
                  <Button
                    variant="text"
                    color="error"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                ) : <Box />}

                <Box display="flex" gap={2}>
                  <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitDisabled}
                  >
                    {isEditing ? 'Update Client' : 'Create Client'}
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

export default ClientForm;

