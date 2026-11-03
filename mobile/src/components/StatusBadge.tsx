/**
 * StatusBadge.tsx
 *
 * Pill label for request status: pending / approved / denied.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import type { RequestStatus } from '../types';

interface Props {
  status: RequestStatus;
}

const config: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: Colors.pending,  bg: Colors.pendingBg  },
  approved: { label: 'Approved', color: Colors.approved, bg: Colors.approvedBg },
  denied:   { label: 'Denied',   color: Colors.denied,   bg: Colors.deniedBg   },
};

export function StatusBadge({ status }: Props) {
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
