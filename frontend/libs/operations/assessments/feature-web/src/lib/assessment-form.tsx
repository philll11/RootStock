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
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import {
  Assessment,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentSample,
} from '@rootstock/operations/assessments/assessments-data-access';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { FormLayout } from '@rootstock/ui/web';
import { palette, iconSizes, spacing } from '@rootstock/ui/theme';

export type AssessmentFormMode = 'create' | 'edit' | 'view';

interface AssessmentFormProps {
  assessment?: Assessment | null;
  mode: AssessmentFormMode;
  onSubmit: (values: CreateAssessmentDto | UpdateAssessmentDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  initialValues?: Partial<CreateAssessmentDto>;
  blockId?: string;
  fullHeight?: boolean;
}

export function AssessmentForm({
  assessment,
  mode,
  onSubmit,
  onCancel,
  isLoading,
  onDirtyChange,
  initialValues,
  blockId,
  fullHeight = true,
}: AssessmentFormProps) {
  const isView = mode === 'view';

  const form = useForm<CreateAssessmentDto>({
    initialValues: {
      blockId: blockId || '',
      date: assessment ? new Date(assessment.date) : new Date(),
      samples: assessment?.samples || initialValues?.samples || [],
    },
    validate: {
      date: (value) => (value ? null : 'Date is required'),
      samples: {
        rowNumber: (value) => (value > 0 ? null : 'Row number is required'),
        totalFruit: (value) => (value >= 0 ? null : 'Total fruit must be >= 0'),
        damagedFruit: (value) => (value >= 0 ? null : 'Damaged fruit must be >= 0'),
      },
    },
  });

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    onSubmit(values);
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

  return (
    <FormLayout
      mode={mode}
      onSubmit={form.onSubmit(handleSubmit)}
      onCancel={onCancel}
      onEdit={() => {}} // Not used in create/view usually, but required by layout if we want edit button
      isLoading={isLoading}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <Stack gap={spacing.md}>
        <DateInput
          label="Assessment Date"
          placeholder="Pick date"
          required
          readOnly={isView}
          {...form.getInputProps('date')}
        />

        <Box>
          <Group justify="space-between" mb={spacing.sm}>
            <Text fw={500}>Samples</Text>
            {!isView && (
              <Button
                leftSection={<IconPlus size={iconSizes.sm} />}
                variant="light"
                size="xs"
                onClick={addSample}
              >
                Add Sample
              </Button>
            )}
          </Group>

          {form.values.samples && form.values.samples.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Row</Table.Th>
                  <Table.Th>Total Fruit</Table.Th>
                  <Table.Th>Damaged</Table.Th>
                  {!isView && <Table.Th style={{ width: 40 }} />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {form.values.samples.map((sample, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <NumberInput
                        min={1}
                        size="xs"
                        readOnly={isView}
                        {...form.getInputProps(`samples.${index}.rowNumber`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        size="xs"
                        readOnly={isView}
                        {...form.getInputProps(`samples.${index}.totalFruit`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        size="xs"
                        readOnly={isView}
                        {...form.getInputProps(`samples.${index}.damagedFruit`)}
                      />
                    </Table.Td>
                    {!isView && (
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
        </Box>
      </Stack>
    </FormLayout>
  );
}
