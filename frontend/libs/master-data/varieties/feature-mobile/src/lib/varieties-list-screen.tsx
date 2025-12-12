import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useDrawer } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const VarietiesListScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { toggleDrawer } = useDrawer();
  const { varietiesQuery } = useVarieties();
  const { data: varieties, isLoading } = varietiesQuery;
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.VARIETY_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredVarieties = varieties?.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="Varieties" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search varieties"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredVarieties}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.recordId}
                left={props => <List.Icon {...props} icon="leaf" />}
                right={props => (
                  <View style={styles.statusContainer}>
                    <Chip 
                      mode="flat" 
                      compact 
                      style={{ backgroundColor: item.isActive ? theme.colors.primaryContainer : theme.colors.surfaceDisabled }}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Chip>
                  </View>
                )}
                onPress={() => navigation.navigate('VarietyForm', { varietyId: item._id })}
              />
            )}
          />
        )}
      </View>

      {canCreate && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('VarietyForm')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  searchBar: { margin: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusContainer: { justifyContent: 'center', marginRight: 8 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});
