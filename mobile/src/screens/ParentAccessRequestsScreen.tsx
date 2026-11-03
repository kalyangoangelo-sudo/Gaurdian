/**
 * ParentAccessRequestsScreen.tsx
 *
 * Parent — review and decide on child access requests.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPut } from '../config/api';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import type { RequestStatus } from '../types';

interface AccessRequestItem {
  id: string;
  url: string;
  reason?: string;
  status: RequestStatus;
  createdAt?: string;
  childId?: string;
}

export default function ParentAccessRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet('/requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleDecide = useCallback(async (id: string, decision: 'approved' | 'denied') => {
    if (decidingId) return;
    setDecidingId(id);
    try {
      await apiPut(`/requests/${id}/decide`, { decision });
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: decision } : r)
      );
    } catch (err) {
      // Show inline; no Alert here to keep UX clean
      setError(err instanceof Error ? err.message : 'Failed to update request.');
    } finally {
      setDecidingId(null);
    }
  }, [decidingId]);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Access Requests" onBack={() => router.back()} />
        <LoadingState message="Loading requests…" />
      </View>
    );
  }

  const pending = requests.filter(r => r.status === 'pending');
  const decided = requests.filter(r => r.status !== 'pending');

  const renderItem = ({ item }: { item: AccessRequestItem }) => {
    const isPending = item.status === 'pending';
    const isDeciding = decidingId === item.id;

    return (
      <Card style={styles.card}>
        <Text style={styles.url} numberOfLines={2} ellipsizeMode="middle">
          {item.url}
        </Text>
        {item.reason ? (
          <Text style={styles.reason}>"{item.reason}"</Text>
        ) : null}
        <View style={styles.metaRow}>
          {item.createdAt && (
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          )}
          <StatusBadge status={item.status} />
        </View>
        {isPending && (
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Approve"
              variant="success"
              onPress={() => handleDecide(item.id, 'approved')}
              loading={isDeciding}
              disabled={!!decidingId}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label="Deny"
              variant="danger"
              onPress={() => handleDecide(item.id, 'denied')}
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
      <ScreenHeader title="Access Requests" onBack={() => router.back()} />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : null}
      <FlatList
        data={[...pending, ...decided]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          pending.length > 0 ? (
            <Text style={styles.pendingHeader}>
              {pending.length} pending request{pending.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Access Requests</Text>
            <Text style={styles.emptyText}>
              Your child has not submitted any access requests yet.
            </Text>
          </View>
        }
      />
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
  card: { marginBottom: Spacing.sm },
  url: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
