/**
 * ScreenHeader.tsx
 *
 * Navy (#1B2A4A) top bar with a white title and optional back button.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontSize, Spacing } from '../styles/theme';

const NAVY = '#1B2A4A';
const WHITE = '#FFFFFF';

interface Props {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    minHeight: 56,
  },
  backBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    minWidth: 64,
  },
  backText: {
    color: WHITE,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: WHITE,
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  backPlaceholder: {
    minWidth: 64,
  },
});
