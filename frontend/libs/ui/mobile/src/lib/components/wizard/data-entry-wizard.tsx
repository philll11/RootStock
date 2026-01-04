import React from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, useTheme, IconButton, ProgressBar } from 'react-native-paper';
import { spacing, layout } from '@rootstock/ui/theme';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTheme } from '../../mobile-theme';

export interface DataEntryWizardProps {
  visible: boolean;
  title: string;
  itemNumber: number;
  totalItems?: number;
  children: React.ReactNode;
  onSaveAndNext: () => Promise<void>;
  onSaveAndFinish: () => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DataEntryWizard = ({
  visible,
  title,
  itemNumber,
  totalItems,
  children,
  onSaveAndNext,
  onSaveAndFinish,
  onCancel,
  isSubmitting = false,
}: DataEntryWizardProps) => {
  const theme = useTheme<AppTheme>();

  const handleSaveAndNext = async () => {
    await onSaveAndNext();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

    const handleSaveAndFinish = async () => {
        await onSaveAndFinish();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <IconButton icon="close" onPress={onCancel} />
                    <View style={styles.headerText}>
                        <Text variant="titleMedium">{title}</Text>
                        <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                            Item #{itemNumber}
                        </Text>
                    </View>
                    <Button mode="text" onPress={handleSaveAndFinish} disabled={isSubmitting}>
                        Finish
                    </Button>
                </View>

                {totalItems && (
                    <ProgressBar
                        progress={itemNumber / totalItems}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                    />
                )}

                {/* Content */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {children}
                </KeyboardAvoidingView>

                {/* Footer Actions */}
                <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
                    <Button
                        mode="contained"
                        onPress={handleSaveAndNext}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        style={styles.primaryButton}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                    >
                        Save & Next Item
                    </Button>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    headerText: {
        alignItems: 'center',
    },
    progressBar: {
        height: 4,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    footer: {
        padding: spacing.md,
        borderTopWidth: 1,
    },
    primaryButton: {
        borderRadius: 'md',
    },
    buttonContent: {
        height: 56,
    },
    buttonLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
