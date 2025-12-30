import React from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useGetOrchard, useDeleteOrchard } from '@rootstock/assets/orchards/orchards-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteOrchard } = useDeleteOrchard();
  const { data: orchard, isLoading } = useGetOrchard(id!);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Orchard',
      'Are you sure you want to delete this orchard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteOrchard(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!orchard) {
    return (
      <View style={styles.centerContainer}>
        <Text>Orchard not found</Text>
      </View>
    );
  }

  const clientName = typeof orchard.clientId === 'object' ? (orchard.clientId as any).name : 'Unknown Client';
  const userNames = orchard.userIds?.map((u: any) => 
    typeof u === 'object' ? u.name : 'Unknown User'
  ) || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.ORCHARD_EDIT) ? (
              <Button onPress={() => router.push(`/assets/orchards/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: orchard.name
        }}
      />
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <DetailRow label="Name" value={orchard.name} />
        <DetailRow label="Client" value={clientName} />
        <DetailRow label="Status" value={orchard.isActive ? 'Active' : 'Inactive'} />
        
        <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          Assigned Users
        </Text>
        <View style={styles.chipContainer}>
          {userNames.map((name: string, index: number) => (
            <Chip key={index} style={styles.chip}>{name}</Chip>
          ))}
          {userNames.length === 0 && <Text variant="bodyMedium">No users assigned</Text>}
        </View>

        {can(PERMISSIONS.ORCHARD_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete Orchard
          </Button>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
});
