import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { List } from 'react-native-paper';
import { ListLayout } from '@rootstock/ui/mobile';
import { useGetAssessments } from '@rootstock/operations/assessments/assessments-data-access';
import { format } from 'date-fns';

export function AssessmentListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  // TODO: Add filtering by blockId if needed, for now just list all
  const { data, isLoading, refetch, isRefetching } = useGetAssessments({
    // search: searchQuery, // Assuming backend supports search
  });

  const handlePress = (id: string) => {
    router.push(`/operations/assessments/${id}`);
  };

  const handleAdd = () => {
    router.push('/operations/assessments/create');
  };

  return (
    <ListLayout
      title="Assessments"
      onSearch={setSearchQuery}
      searchQuery={searchQuery}
      onAdd={handleAdd}
      isLoading={isLoading}
      onRefresh={refetch}
      isRefreshing={isRefetching}
      emptyText="No assessments found"
    >
      {data?.data.map((assessment) => (
        <List.Item
          key={assessment.id}
          title={`Assessment - ${format(new Date(assessment.date), 'PP')}`}
          description={`Block ID: ${assessment.blockId} | Samples: ${assessment.samples?.length || 0}`}
          left={(props) => <List.Icon {...props} icon="clipboard-check-outline" />}
          onPress={() => handlePress(assessment.id)}
        />
      ))}
    </ListLayout>
  );
}
