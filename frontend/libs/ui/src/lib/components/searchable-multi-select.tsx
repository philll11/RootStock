import { MultiSelect, MultiSelectProps, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState, useEffect } from 'react';

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
  
  // Keep track of options that are selected so they don't disappear when searching
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
        // Combine results with selectedOptions to ensure selected items are always available in the list
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
    // Find the full option objects for the selected values
    const newSelected = values.map(v => options.find(o => o.value === v)).filter((o): o is {value: string, label: string} => !!o);
    
    // Merge with existing selectedOptions to preserve ones that might not be in current 'options' (though handleFetch tries to keep them)
    // Actually, 'options' should contain everything we need because handleFetch merges selectedOptions.
    // But if we just selected something new, it's in 'options'.
    
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
      rightSection={loading ? <Loader size={18} /> : null}
      filter={({ options }) => options}
      nothingFoundMessage={loading ? 'Searching...' : 'Nothing found'}
    />
  );
}
