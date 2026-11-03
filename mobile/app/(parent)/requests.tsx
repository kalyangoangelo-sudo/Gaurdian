/**
 * app/(parent)/requests.tsx
 *
 * Parent Requests tab — review and decide on child access requests (real Firestore).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  decideRequest,
  subscribeParentRequests,
} from '../../src/services/firebaseRequests';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatusBadge } from '../../src/components/StatusBadge';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ErrorState } from '../../src/components/ErrorState';
import { Colors, FontSize, Spacing } from '../../src/styles/theme';
import type { AccessRequest } from '../../src/types';

export default function ParentRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeParentRequests(
      user.id,
      (data) => { setRequests(data); setListError(null); },
      (err) => setListError(err.message)
    );
    return unsub;
  }, [user?.id]);

  const handleDecision = useCallback(
    async (requestId: string, decision: 'approved' | 'denied') => {
      if (!user || decidingId) return;
      setDecidingId(requestId);
      setDecisionError(null);
      try {
        await decideRequest(requestId, user.id, decision);
      } catch (err) {
        setDecisionError(err instanceof Error ? err.message : 'Failed to submit decision.');
      } finally {
        setDecidingId(null);
      }
    },
    [user, decidingId]
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const decidedRequests = requests.filter(r => r.status !== 'pending');

  const renderItem = ({ item }: { item: AccessRequest }) => {
    const isPending = item.status === 'pending';
    const isDeciding = decidingId === item.id;

    return (
      <Card style={styles.card}>
        <Text style={styles.url} numberOfLines={2} ellipsizeMode="middle">
          {item.url}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        {isPending && (
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Approve"
              variant="success"
              onPress={() => handleDecision(item.id, 'approved')}
              loading={isDeciding}
              disabled={!!decidingId}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label="Deny"
              variant="danger"
              onPress={() => handleDecision(item.id, 'denied')}
              loading={isDeciding}
              disabled={!!decidingId}
              style={styles.actionBtn}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Access Requests" />
      {decisionError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{decisionError}</Text>
        </View>
      ) : null}
      {listError ? (
        <ErrorState message={listError} />
      ) : (
        <FlatList
          data={[...pendingRequests, ...decidedRequests]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <Text style={styles.pendingHeader}>
                {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No Access Requests</Text>
              <Text style={styles.emptyText}>
                When your child requests access to a website, it will appear here instantly.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  pendingHeader: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.pending,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: 6,
    padding: Spacing.sm,
    margin: Spacing.md,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  card: { marginBottom: Spacing.sm },
  url: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
