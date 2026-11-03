/**
 * ParentRemovalRequestsScreen.tsx
 *
 * Parent — review and decide on child removal requests.
 * PUT /removal-request/:id/decide  { decision: 'approved' | 'denied' }
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPut } from '../config/api';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { Colors, FontSize, Spacing } from '../styles/theme';

const PLACEHOLDER_PARENT_ID = 'demo-parent';

interface RemovalRequest {
  id: string;
  reason: string;
  status?: string;
  createdAt?: string;
  childId?: string;
}

export default function ParentRemovalRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<RemovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet(`/removal-requests/${PLACEHOLDER_PARENT_ID}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load removal requests.');
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

    if (decision === 'approved') {
      Alert.alert(
        'Approve Removal Request',
        'Approving this request will authorize GuardianLink removal from the child device. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve Removal',
            style: 'destructive',
            onPress: () => submitDecision(id, decision),
          },
        ]
      );
    } else {
      submitDecision(id, decision);
    }
  }, [decidingId]);

  const submitDecision = useCallback(async (id: string, decision: 'approved' | 'denied') => {
    setDecidingId(id);
    try {
      await apiPut(`/removal-request/${id}/decide`, { decision });
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: decision } : r)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision.');
    } finally {
      setDecidingId(null);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Removal Requests" onBack={() => router.back()} />
        <LoadingState message="Loading removal requests…" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: RemovalRequest }) => {
    const isPending = !item.status || item.status === 'pending';
    const isDeciding = decidingId === item.id;
    const statusLabel = item.status ?? 'pending';
    const statusColor =
      statusLabel === 'approved' ? Colors.approved :
      statusLabel === 'denied' ? Colors.denied :
      Colors.pending;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Removal Request</Text>
          <StatusBadge label={statusLabel} color={statusColor} />
        </View>
        {item.createdAt && (
          <Text style={styles.date}>
            Submitted: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.reasonLabel}>Child's reason:</Text>
        <Text style={styles.reason}>"{item.reason}"</Text>

        {isPending && (
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Approve Removal"
              variant="danger"
              onPress={() => handleDecide(item.id, 'approved')}
              loading={isDeciding}
              disabled={!!decidingId}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label="Deny"
              variant="success"
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
      <ScreenHeader title="Removal Requests" onBack={() => router.back()} />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : null}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No Removal Requests</Text>
            <Text style={styles.emptyText}>
              Your child has not requested GuardianLink removal.
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
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  reasonLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  reason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
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
