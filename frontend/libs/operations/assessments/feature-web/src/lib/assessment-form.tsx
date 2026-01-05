import {
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  NumberInput,
  Box,
  Table,
  Select,
  Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';
import {
  Assessment,
  AssessmentFormData,
  AssessmentStatus,
  AssessmentSample,
  AssessmentType,
} from '@rootstock/operations/assessments/assessments-data-access';
import { useGetBlocks } from '@rootstock/assets/blocks/blocks-data-access';
import { IconTrash, IconPlus, IconCalendar } from '@tabler/icons-react';
import { FormLayout } from '@rootstock/ui/web';
import { palette, iconSizes, spacing } from '@rootstock/ui/theme';

export type AssessmentFormMode = 'create' | 'edit' | 'view';

interface AssessmentFormProps {
  assessment?: Assessment | null;
  mode: AssessmentFormMode;
  onSubmit: (values: AssessmentFormData) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  initialValues?: Partial<AssessmentFormData>;
  onValuesChange?: (values: Partial<AssessmentFormData>) => void;
  blockId?: string;
  fullHeight?: boolean;
  isLocked?: boolean;
}

export function AssessmentForm({
  assessment,
  mode,
  onSubmit,
  onCancel,
  onEdit,
  isLoading,
  onDirtyChange,
  initialValues,
  onValuesChange,
  blockId,
  fullHeight = true,
  isLocked = false,
}: AssessmentFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const { data: blocks, isLoading: isLoadingBlocks } = useGetBlocks();

  const blockOptions = useMemo(() => {
    return (
      blocks?.map((block) => ({
        value: block._id,
        label: typeof block.orchardId === 'object' ? `${block.orchardId.name} - ${block.name}`: block.name,
      })) || []
    );
  }, [blocks]);

  const form = useForm<AssessmentFormData>({
    initialValues: {
      name: '',
      type: null,
      blockId: blockId || null,
      date: new Date(),
      samples: [],
      status: AssessmentStatus.PENDING,
      changeReason: '',
      __v: 0,
      ...initialValues,
    },
    validate: {
      name: (value) => (value ? null : 'Name is required'),
      blockId: (value) => (value ? null : 'Block is required'),
      date: (value) => (value ? null : 'Date is required'),
      samples: {
        rowNumber: (value) => (value > 0 ? null : 'Row number is required'),
        totalFruit: (value) => (value >= 0 ? null : 'Total fruit must be >= 0'),
        damagedFruit: (value) => (value >= 0 ? null : 'Damaged fruit must be >= 0'),
      },
    },
  });

  useEffect(() => {
    if (isCreating && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  useEffect(() => {
    if (assessment && (isEditing || isViewing)) {
      form.initialize({
        name: assessment.name,
        type: assessment.type,
        blockId: typeof assessment.blockId === 'object' ? assessment.blockId._id : assessment.blockId,
        date: new Date(assessment.date),
        samples: assessment.samples,
        status: assessment.status,
        changeReason: '',
        __v: assessment.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        type: initialValues.type || null,
        blockId: initialValues.blockId || blockId || null,
        date: initialValues.date || new Date(),
        samples: initialValues.samples || [],
        status: initialValues.status || AssessmentStatus.PENDING,
        changeReason: '',
        __v: 0,
      });
    }
  }, [assessment, mode, blockId, isEditing, isViewing, isCreating]);

  const handleSubmit = (values: typeof form.values) => {
    const indexedSamples = values.samples?.map((sample, index) => ({
      ...sample,
      rowNumber: index + 1,
    }));
    onSubmit({ ...values, samples: indexedSamples });
  };

  const addSample = () => {
    form.insertListItem('samples', {
      rowNumber: form.values.samples ? form.values.samples.length + 1 : 1,
      totalFruit: 0,
      damagedFruit: 0,
    });
  };

  const removeSample = (index: number) => {
    form.removeListItem('samples', index);
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      type: null,
      blockId: blockId || null,
      date: new Date(),
      samples: [],
      status: AssessmentStatus.PENDING,
      changeReason: '',
      __v: 0,
    });
  };

  return (
    <FormLayout
      mode={mode}
      onSubmit={form.onSubmit(handleSubmit)}
      onCancel={onCancel}
      onEdit={onEdit}
      onClear={isCreating ? handleClear : undefined}
      isLoading={isLoading}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <Stack gap={spacing.md}>
        <TextInput
          label="Name"
          placeholder="Assessment Name"
          required
          readOnly={isViewing}
          disabled={isLocked}
          {...form.getInputProps('name')}
        />

        <Select
          label="Type"
          placeholder="Select type"
          data={Object.values(AssessmentType)}
          required
          readOnly={isViewing}
          disabled={isLocked}
          {...form.getInputProps('type')}
        />

        <Select
          label="Block"
          placeholder="Select block"
          data={blockOptions}
          required
          searchable
          readOnly={isViewing || !!blockId}
          disabled={isLoadingBlocks || isLocked}
          rightSection={isLoadingBlocks ? <Loader size="xs" /> : null}
          {...form.getInputProps('blockId')}
        />

        <TextInput
          label="Status"
          readOnly
          disabled
          {...form.getInputProps('status')}
        />

        <DateInput
          label="Assessment Date"
          placeholder="Pick date"
          required
          readOnly={isViewing}
          disabled={isLocked}
          valueFormat="DD MMM YYYY"
          leftSection={<IconCalendar size={iconSizes.sm} />}
          {...form.getInputProps('date')}
        />

        {isEditing && assessment?.status === AssessmentStatus.COMPLETED && (
          <TextInput
            label="Reason for Change"
            placeholder="Explain why you are modifying this locked record"
            required
            {...form.getInputProps('changeReason')}
          />
        )}

        <Box>
          <Text fw={500} mb={spacing.sm}>Samples</Text>

          {form.values.samples && form.values.samples.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Row</Table.Th>
                  <Table.Th>Total Fruit</Table.Th>
                  <Table.Th>Damaged</Table.Th>
                  {!isViewing && <Table.Th style={{ width: 40 }} />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {form.values.samples.map((sample, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" ta="center">
                        {index + 1}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        size="xs"
                        readOnly={isViewing}
                        disabled={isLocked}
                        {...form.getInputProps(`samples.${index}.totalFruit`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        size="xs"
                        readOnly={isViewing}
                        disabled={isLocked}
                        {...form.getInputProps(`samples.${index}.damagedFruit`)}
                      />
                    </Table.Td>
                    {!isViewing && !isLocked && (
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => removeSample(index)}
                        >
                          <IconTrash size={iconSizes.sm} />
                        </ActionIcon>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" size="sm" ta="center" py={spacing.md}>
              No samples added yet.
            </Text>
          )}

          {!isViewing && !isLocked && (
            <Button
              leftSection={<IconPlus size={iconSizes.sm} />}
              variant="light"
              size="xs"
              mt={spacing.sm}
              onClick={addSample}
            >
              Add Sample
            </Button>
          )}
        </Box>
      </Stack>
    </FormLayout>
  );
}
