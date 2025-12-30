import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useVarieties, useVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const VarietyViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteVariety } = useVarieties();
  const { data: variety, isLoading } = useVariety(id);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Variety',
      'Are you sure you want to delete this variety?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVariety(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  if (!variety) return <Text>Variety not found</Text>;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.VARIETY_EDIT) ? (
              <Button onPress={() => router.push(`/master-data/varieties/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: variety.name
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <DetailRow label="Name" value={variety.name} />
        <DetailRow label="Status" value={variety.isActive ? 'Active' : 'Inactive'} />
        
        {can(PERMISSIONS.VARIETY_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete Variety
          </Button>
        )}
      </ScrollView>
    </>
  );
};
