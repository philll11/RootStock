import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Switch, Text, useTheme, HelperText } from 'react-native-paper';
import { useClients } from '@rootstock/clients/clients-data-access';
import { useMobileDiscardWarning, FormLayout, FormMode, confirmDiscard } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const ClientFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { clientId } = route.params || {};
  const isEditing = !!clientId;
  
  const { getClient, createClient, updateClient, deleteClient, isCreating, isUpdating } = useClients();
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.CLIENT_EDIT : PERMISSIONS.CLIENT_CREATE);
  
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string}>({});
  
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  const mode: FormMode = isEditing ? (isEditMode ? 'edit' : 'view') : 'create';
  const isView = mode === 'view';

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getClient(clientId)
        .then(client => {
          setName(client.name);
          setIsActive(client.isActive);
          setIsLoading(false);
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch((err: any) => {
          console.error(err);
          if (err.response?.status !== 401) {
            Alert.alert('Error', 'Failed to load client details');
          }
          navigation.goBack();
        });
    }
  }, [clientId, isEditing]);

  const handleNameChange = (text: string) => {
    setName(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleActiveChange = (value: boolean) => {
    setIsActive(value);
    setIsDirty(true);
  };

  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: {name?: string} = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateClient({ id: clientId, data: { name, isActive } });
        setIsEditMode(false);
      } else {
        await createClient({ name });
        navigation.goBack();
      }
      setIsDirty(false);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to save client');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId);
              setIsDirty(false);
              navigation.goBack();
            } catch (error: any) {
              console.error(error);
              if (error.response?.status !== 401) {
                Alert.alert('Error', 'Failed to delete client');
              }
            }
          }
        }
      ]
    );
  };

  const isSaving = isCreating || isUpdating;

  return (
    <FormLayout
      mode={mode}
      title={isEditing ? (isEditMode ? 'Edit Client' : 'Client Details') : 'New Client'}
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            // Reset form
            setIsLoading(true);
            getClient(clientId)
              .then(client => {
                setName(client.name);
                setIsActive(client.isActive);
                setIsLoading(false);
                setIsDirty(false);
              });
          };

          if (isDirty) {
            confirmDiscard(cancelEdit);
          } else {
            cancelEdit();
          }
        } else {
          navigation.goBack();
        }
      }}
      onSubmit={handleSave}
      onEdit={() => setIsEditMode(true)}
      canEdit={canEdit}
      isLoading={isLoading || isSaving || isSubmitting}
      isDirty={isDirty}
    >
      <TextInput
        mode="outlined"
        label="Name"
        value={name}
        onChangeText={handleNameChange}
        error={!!errors.name}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.name && <HelperText type="error">{errors.name}</HelperText>}

      {isEditing && (
        <View style={styles.switchContainer}>
          <Text variant="bodyLarge">Active</Text>
          <Switch 
            value={isActive} 
            onValueChange={handleActiveChange} 
            disabled={isView}
          />
        </View>
      )}

      {isEditMode && isEditing && can(PERMISSIONS.CLIENT_DELETE) && (
        <Button 
          mode="outlined" 
          onPress={handleDelete} 
          textColor={theme.colors.error} 
          style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
        >
          Delete Client
        </Button>
      )}
    </FormLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.sm },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  button: { marginTop: spacing.lg },
});