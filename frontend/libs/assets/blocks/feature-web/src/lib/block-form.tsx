// frontend/libs/assets/blocks/feature-web/src/lib/block-form.tsx
import {
  TextInput,
  Button,
  Group,
  Switch,
  Stack,
  Text,
  Select,
  ActionIcon,
  NumberInput,
  Alert,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState, useMemo } from 'react';
import {
  Block,
  BlockFormData,
} from '@rootstock/assets/blocks/blocks-data-access';
import { useGetVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useGetOrchards } from '@rootstock/assets/orchards/orchards-data-access';
import { IconTrash, IconPlus, IconAlertTriangle } from '@tabler/icons-react';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { FormLayout, ConfirmModal } from '@rootstock/ui/web';
import { palette } from '@rootstock/ui/theme';

// ### Interfaces & Types ###
export type BlockFormMode = 'create' | 'edit' | 'view';

interface BlockFormProps {
  block?: Block | null;
  mode: BlockFormMode;
  onSubmit: (values: BlockFormData) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  initialValues?: Partial<BlockFormData>;
  onValuesChange?: (values: Partial<BlockFormData>) => void;
  orchardId?: string;
  fullHeight?: boolean;
}

export function BlockForm({
  block,
  mode,
  onSubmit,
  onCancel,
  onEdit,
  isLoading,
  onDirtyChange,
  initialValues,
  onValuesChange,
  orchardId,
  fullHeight = true,
}: BlockFormProps) {

  // ### Form Modes, Permissions & State ###
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  const [showReplantingWarning, setShowReplantingWarning] = useState(false);
  const [
    confirmReplantOpened,
    { open: openConfirmReplant, close: closeConfirmReplant },
  ] = useDisclosure(false);

  // 3. Form Definition
  const form = useForm<BlockFormData>({
    initialValues: {
      name: '',
      // Safe id extraction with fallback to orchardId prop
      orchardId: null as string | null,
      isActive: true,
      plantings: [{ varietyId: null as string | null, treeCount: 0 }],
      __v: 0,
      ...initialValues,
    },
    validate: {
      name: (value) => value.length < 2 ? 'Name must be at least 2 characters' : null,
      orchardId: (value) => !value && !orchardId ? 'Orchard is required' : null,
      plantings: {
        varietyId: (value) => (!value ? 'Variety is required' : null),
        treeCount: (value) => value < 0 ? 'Tree count must be positive' : null,
      },
    },
  });

  // ### Data Fetching & Options ###
  const { data: varieties = [], isLoading: isVarietiesLoading } = useGetVarieties();
  const { data: orchards = [], isLoading: isOrchardsLoading } = useGetOrchards();

  const orchardOptions = useMemo(() => {
    return (orchards || []).map((o) => ({ value: o._id, label: o.name }));
  }, [orchards]);

  const varietyOptions = useMemo(() => {
    return (varieties || []).map((v) => ({ value: v._id, label: v.name }));
  }, [varieties]);

  const isDataLoading = isLoading || isVarietiesLoading || isOrchardsLoading;

  // ### Side Effects ###
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as BlockFormData);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  useEffect(() => {
    // Check for replanting warning
    if (isEditing && block) {
      const hasVarietyChanged = form.values.plantings.some((p, index) => {
        const initialP = block.plantings[index];
        const initialVarietyId = initialP
          ? typeof initialP.varietyId === 'object'
            ? (initialP.varietyId as any)._id
            : initialP.varietyId
          : null;
        return initialP && p.varietyId !== initialVarietyId;
      });
      setShowReplantingWarning(hasVarietyChanged);
    }
  }, [form.values, isEditing, block]);

  useEffect(() => {
    if (block && (isEditing || isViewing)) {
      form.initialize({
        name: block.name,
        orchardId: block.orchardId ? typeof block.orchardId === 'object' ? block.orchardId._id : block.orchardId : orchardId || null,
        isActive: block.isActive,
        plantings: block.plantings?.map((p) => ({
          _id: p._id, // Add _id here to preserve stable identity
          varietyId: typeof p.varietyId === 'object' ? p.varietyId._id : p.varietyId,
          treeCount: p.treeCount,
        })) || [],
        __v: block.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        orchardId: initialValues.orchardId || orchardId || null,
        plantings: (initialValues.plantings as any) || [
          { varietyId: null, treeCount: 0 },
        ],
        isActive: true,
      });
    }
  }, [block, mode, orchardId, isEditing, isViewing, isCreating]);

  // ### Event Handlers ###
  const proceedSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      submissionData.__v = block!.__v;
    }
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    }
    onSubmit(submissionData as BlockFormData);
  };

  const handleSubmit = (values: typeof form.values) => {
    if (showReplantingWarning) {
      openConfirmReplant();
      return;
    }
    proceedSubmit(values);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      orchardId: orchardId || null,
      plantings: [{ varietyId: null, treeCount: 0 }],
    });
  };

  // ### Render ###
  return (
    <FormLayout
      mode={mode}
      isDirty={form.isDirty()}
      isLoading={isDataLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      onClear={mode === 'create' ? handleClear : undefined}
      canEdit={can(PERMISSIONS.BLOCK_EDIT)}
      fullHeight={fullHeight}
    >
      <Group grow align="flex-start">
        <TextInput
          label="Name"
          placeholder="Block Name"
          required={!isViewing}
          readOnly={isViewing}
          {...form.getInputProps('name')}
        />

        {!orchardId && (
          <Select
            label="Orchard"
            placeholder="Select Orchard"
            data={orchardOptions}
            required={!isViewing}
            readOnly={isViewing}
            disabled={isEditing}
            searchable
            {...form.getInputProps('orchardId')}
          />
        )}
      </Group>

      <Box mt="md">
        <Group justify="space-between" mb="xs">
          <Text fw={500} size="sm">
            Plantings
          </Text>
          {!isViewing && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                form.insertListItem('plantings', {
                  varietyId: null,
                  treeCount: 0,
                })
              }
            >
              Add Planting
            </Button>
          )}
        </Group>

        {showReplantingWarning && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Replanting Warning"
            color="yellow"
            mb="sm"
          >
            Changing variety will not update historical assessments.
          </Alert>
        )}

        <Stack gap="sm">
          {form.values.plantings.map((item, index) => (
            <Group key={index} align="flex-start">
              <Select
                placeholder="Select Variety"
                data={varietyOptions}
                readOnly={isViewing}
                style={{ flex: 1 }}
                {...form.getInputProps(`plantings.${index}.varietyId`)}
              />
              <NumberInput
                placeholder="Count"
                min={0}
                readOnly={isViewing}
                style={{ width: 100 }}
                {...form.getInputProps(`plantings.${index}.treeCount`)}
              />
              {!isViewing && form.values.plantings.length > 1 && (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('plantings', index)}
                  mt={4}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
        </Stack>
      </Box>

      {mode !== 'create' && can(PERMISSIONS.BLOCK_MANAGE_INACTIVE) && (
        <Switch
          label="Active"
          readOnly={isViewing}
          style={{ pointerEvents: isViewing ? 'none' : 'auto' }}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt="md"
        />
      )}

      <ConfirmModal
        opened={confirmReplantOpened}
        onClose={closeConfirmReplant}
        onConfirm={() => {
          closeConfirmReplant();
          proceedSubmit(form.values);
        }}
        title="Confirm Replanting"
        message="Changing the variety implies a replanting. Historical assessments will remain linked to the old variety context. Are you sure you want to proceed?"
        confirmLabel="Confirm Change"
        confirmColor={palette.buttons.warning}
      />
    </FormLayout>
  );
}
