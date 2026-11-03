/**
 * RequestCard.tsx
 *
 * Renders a single access request.
 *
 * Parent view: shows Approve / Deny buttons for pending requests.
 * Child view: read-only status display.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../styles/theme';
import { StatusBadge } from './StatusBadge';
import { PrimaryButton } from './PrimaryButton';
import type { AccessRequest } from '../types';

interface Props {
  request: AccessRequest;
  /** If provided, renders parent decision controls */
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  /** Per-card loading state so only the active card spinner shows */
  decidingId?: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RequestCard({ request, onApprove, onDeny, decidingId }: Props) {
  const isDeciding = decidingId === request.id;
  const showControls = request.status === 'pending' && (onApprove || onDeny);

  return (
    <View style={styles.card}>
      {/* URL */}
      <Text style={styles.url} numberOfLines={2} ellipsizeMode="middle">
        {request.url}
      </Text>

      {/* Meta row */}
      <View style={styles.meta}>
        <Text style={styles.metaText}>{formatDate(request.createdAt)}</Text>
        <StatusBadge status={request.status} />
      </View>

      {/* Child username label (parent view) */}
      {onApprove && (
        <Text style={styles.childLabel}>
          Requested by:{' '}
          <Text style={styles.childName}>child</Text>
        </Text>
      )}

      {/* Decision timestamp */}
      {request.decidedAt && (
        <Text style={styles.metaText}>
          Decided: {formatDate(request.decidedAt)}
        </Text>
      )}

      {/* Approve / Deny actions (parent only, pending only) */}
      {showControls && (
        <View style={styles.actions}>
          <PrimaryButton
            label="Approve"
            variant="success"
            onPress={() => onApprove!(request.id)}
            loading={isDeciding}
            disabled={!!decidingId}
            style={styles.actionBtn}
          />
          <PrimaryButton
            label="Deny"
            variant="danger"
            onPress={() => onDeny!(request.id)}
            loading={isDeciding}
            disabled={!!decidingId}
            style={styles.actionBtn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  url: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  childLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  childName: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
  },
});
