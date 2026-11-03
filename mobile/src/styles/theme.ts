/**
 * theme.ts
 *
 * Design tokens for GuardianLink Lite.
 * All colours, spacing, typography, and radius values come from here
 * so the app stays visually consistent.
 */

export const Colors = {
  // Brand
  primary: '#1B2A4A',       // Deep navy blue
  primaryLight: '#2C4A7C',  // Lighter navy for hover states
  primaryVeryLight: '#E8EDF5', // Very light navy tint for backgrounds

  // Actions
  blue: '#2563EB',
  blueLight: '#DBEAFE',

  // Status
  pending: '#D97706',       // Amber
  pendingBg: '#FEF3C7',
  approved: '#059669',      // Green
  approvedBg: '#D1FAE5',
  denied: '#DC2626',        // Red
  deniedBg: '#FEE2E2',

  // Neutrals
  white: '#FFFFFF',
  backgroundPage: '#F3F4F6',
  backgroundCard: '#FFFFFF',
  border: '#E5E7EB',
  borderFocused: '#2563EB',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnBlue: '#FFFFFF',

  // Connection indicator
  connected: '#059669',
  disconnected: '#DC2626',
  connecting: '#D97706',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
