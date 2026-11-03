/**
 * PrimaryButton.tsx
 *
 * Reusable accessible button with loading state.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'success' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

const variantColors: Record<string, { bg: string; text: string }> = {
  primary: { bg: Colors.blue,     text: Colors.white    },
  danger:  { bg: Colors.denied,   text: Colors.white    },
  success: { bg: Colors.approved, text: Colors.white    },
  ghost:   { bg: 'transparent',   text: Colors.textSecondary },
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const { bg, text } = variantColors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.ghostBorder,
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={text} />
      ) : (
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
