import { MultiSelect, MultiSelectProps, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { iconSizes } from '@rootstock/ui/theme';

export interface SearchableMultiSelectProps extends Omit<MultiSelectProps, 'data'> {
  fetchOptions: (query: string) => Promise<{ value: string; label: string }[]>;
  debounceTime?: number;
  initialOptions?: { value: string; label: string }[];
}

export function SearchableMultiSelect({
  fetchOptions,
  debounceTime = 300,
  initialOptions = [],
  onChange,
  ...props
}: SearchableMultiSelectProps) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue] = useDebouncedValue(searchValue, debounceTime);
  const [options, setOptions] = useState<{ value: string; label: string }[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  
  const [selectedOptions, setSelectedOptions] = useState<{ value: string; label: string }[]>(initialOptions);
  
  useEffect(() => {
    if (initialOptions.length > 0) {
        setOptions(prev => {
            const newOptions = [...prev];
            initialOptions.forEach(opt => {
                if (!newOptions.find(o => o.value === opt.value)) {
                    newOptions.push(opt);
                }
            });
            return newOptions;
        });
        setSelectedOptions(initialOptions);
    }
  }, [initialOptions]);

  useEffect(() => {
    handleFetch(debouncedSearchValue);
  }, [debouncedSearchValue]);

  const handleFetch = async (query: string) => {
    setLoading(true);
    try {
      const results = await fetchOptions(query);
      setOptions(prev => {
        const combined = [...results];
        selectedOptions.forEach(opt => {
            if (!combined.find(o => o.value === opt.value)) {
                combined.push(opt);
            }
        });
        return combined;
      });
    } catch (error) {
      console.error('Failed to fetch options', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (values: string[]) => {
    const newSelected = values.map(v => options.find(o => o.value === v)).filter((o): o is {value: string, label: string} => !!o);
    setSelectedOptions(newSelected);
    onChange?.(values);
  };

  return (
    <MultiSelect
      {...props}
      data={options}
      searchable
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onChange={handleChange}
      rightSection={loading ? <Loader size={iconSizes.md} /> : null}
      filter={({ options }) => options}
      nothingFoundMessage={loading ? 'Searching...' : 'Nothing found'}
    />
  );
}