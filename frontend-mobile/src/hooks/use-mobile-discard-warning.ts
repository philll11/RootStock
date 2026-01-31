import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const confirmDiscard = (onDiscard: () => void) => {
  Alert.alert(
    'Discard changes?',
    'You have unsaved changes. Are you sure you want to discard them?',
    [
      { text: "Keep Editing", style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: onDiscard,
      },
    ]
  );
};

export function useMobileDiscardWarning(isDirty: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) {
        // If we don't have unsaved changes, then we don't need to do anything
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user before leaving the screen
      confirmDiscard(() => navigation.dispatch(e.data.action));
    });

    return unsubscribe;
  }, [navigation, isDirty]);
}
