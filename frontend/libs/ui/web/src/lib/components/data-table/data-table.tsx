import { Table, Text, Loader, Center, Group, ActionIcon, Popover, Checkbox, Stack, Button } from '@mantine/core';
import { IconColumns, IconChevronUp, IconChevronDown, IconArrowsSort } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';

export interface DataTableColumn<T> {
  accessor: keyof T | string;
  title: string;
  render?: (record: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  onRowClick?: (record: T) => void;
  isLoading?: boolean;
  noDataMessage?: string;
  keyExtractor?: (record: T) => string | number;
  onSort?: (accessor: string, direction: 'asc' | 'desc') => void;
  initialSort?: { accessor: string; direction: 'asc' | 'desc' };
}

export function DataTable<T extends { _id?: string; id?: string }>({ 
  data, 
  columns, 
  onRowClick,
  isLoading,
  noDataMessage = 'No records found',
  keyExtractor,
  onSort,
  initialSort
}: DataTableProps<T>) {
  
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(
    columns.filter(c => c.hidden).map(c => String(c.accessor))
  );
  
  const [sortState, setSortState] = useState<{ accessor: string; direction: 'asc' | 'desc' } | null>(
    initialSort || null
  );

  const handleSort = (accessor: string) => {
    if (!onSort) return;
    
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortState?.accessor === accessor && sortState.direction === 'asc') {
      newDirection = 'desc';
    }
    
    setSortState({ accessor, direction: newDirection });
    onSort(accessor, newDirection);
  };

  const toggleColumn = (accessor: string) => {
    setHiddenColumns(current => 
      current.includes(accessor) 
        ? current.filter(c => c !== accessor)
        : [...current, accessor]
    );
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.includes(String(col.accessor)));

  const rows = data?.map((record, index) => {
    const key = keyExtractor ? keyExtractor(record) : (record._id || record.id || index);
    return (
      <Table.Tr 
        key={key} 
        onClick={() => onRowClick?.(record)}
        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
      >
        {visibleColumns.map((col) => (
          <Table.Td key={String(col.accessor)} align={col.align}>
            {col.render ? col.render(record) : (record as any)[col.accessor]}
          </Table.Td>
        ))}
      </Table.Tr>
    );
  });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <Group justify="flex-end" mb="xs">
        <Popover position="bottom-end" withArrow shadow="md">
          <Popover.Target>
            <Button variant="subtle" size="xs" leftSection={<IconColumns size={14} />}>
              Columns
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              {columns.map(col => (
                <Checkbox 
                  key={String(col.accessor)}
                  label={col.title || String(col.accessor)}
                  checked={!hiddenColumns.includes(String(col.accessor))}
                  onChange={() => toggleColumn(String(col.accessor))}
                />
              ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {visibleColumns.map((col) => (
              <Table.Th 
                key={String(col.accessor)} 
                style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }} 
                align={col.align}
                onClick={() => col.sortable && handleSort(String(col.accessor))}
              >
                <Group gap={4} justify={col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'}>
                  {col.title}
                  {col.sortable && (
                    sortState?.accessor === String(col.accessor) ? (
                      sortState.direction === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                    ) : col.sortable ? (
                      <IconArrowsSort size={14} style={{ opacity: 0.3 }} />
                    ) : null
                  )}
                </Group>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows && rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={visibleColumns.length}>
                <Text ta="center" py="md" c="dimmed">{noDataMessage}</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </>
  );
}
