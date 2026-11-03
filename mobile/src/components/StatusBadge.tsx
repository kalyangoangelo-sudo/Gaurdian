/**
 * StatusBadge.tsx
 *
 * Pill label component.
 *
 * Supports two usage patterns:
 *   1. Legacy: <StatusBadge status="pending" /> — RequestStatus-based colors
 *   2. New:    <StatusBadge label="Reviewed" color="#059669" /> — arbitrary label/color
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import type { RequestStatus } from '../types';

type StatusProps = {
  status: RequestStatus;
  label?: never;
  color?: never;
};

type LabelProps = {
  label: string;
  color?: string;
  status?: never;
};

type Props = StatusProps | LabelProps;

const statusConfig: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: Colors.pending,  bg: Colors.pendingBg  },
  approved: { label: 'Approved', color: Colors.approved, bg: Colors.approvedBg },
  denied:   { label: 'Denied',   color: Colors.denied,   bg: Colors.deniedBg   },
};

export function StatusBadge(props: Props) {
  let label: string;
  let color: string;
  let bg: string;

  if ('status' in props && props.status !== undefined) {
    const cfg = statusConfig[props.status];
    label = cfg.label;
    color = cfg.color;
    bg = cfg.bg;
  } else {
    label = (props as LabelProps).label;
    color = (props as LabelProps).color ?? Colors.blue;
    bg = color + '22';
  }

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
