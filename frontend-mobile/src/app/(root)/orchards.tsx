import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';

export default function Orchards() {
    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={{ marginBottom: 20 }}>Orchards</Text>

            <List.Section>
                <List.Subheader>Active Orchards</List.Subheader>
                <List.Item
                    title="Sunrise Block A"
                    description="Apples - Gala"
                    left={props => <List.Icon {...props} icon="tree" />}
                />
                <List.Item
                    title="Sunset Block B"
                    description="Apples - Fuji"
                    left={props => <List.Icon {...props} icon="tree" />}
                />
            </List.Section>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
});
