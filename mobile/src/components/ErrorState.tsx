/**
 * ErrorState.tsx
 *
 * Displays a red error message with an optional retry button.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.md,
    alignItems: 'center',
    margin: Spacing.md,
  },
  message: {
    color: Colors.denied,
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.denied,
    borderRadius: Radius.sm,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
