import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, FAB } from 'react-native-paper';
import { useOrchard } from '@rootstock/orchards/orchards-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { OrchardForm } from './orchard-form';

export function OrchardViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orchard, isLoading, isError } = useOrchard(id!);
  const { can } = usePermission();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !orchard) {
    return (
      <View style={styles.center}>
        <Text>Error loading orchard details</Text>
      </View>
    );
  }

  const defaultValues = {
    name: orchard.name,
    clientId:
      typeof orchard.clientId === 'string'
        ? orchard.clientId
        : orchard.clientId._id,
    userIds:
      orchard.userIds?.map((u) => (typeof u === 'string' ? u : u._id)) || [],
    isActive: orchard.isActive,
  };

  const canEdit = can(PERMISSIONS.ORCHARD_EDIT);

  return (
    <View style={styles.container}>
      <OrchardForm
        mode="view"
        defaultValues={defaultValues}
        onSubmit={async () => {}}
        onCancel={() => router.back()}
      />
      {canEdit && (
        <FAB
          icon="pencil"
          style={styles.fab}
          onPress={() => router.push(`/assets/orchards/edit?id=${id}`)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
