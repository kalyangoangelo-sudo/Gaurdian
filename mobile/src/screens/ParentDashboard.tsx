/**
 * ParentDashboard.tsx
 *
 * Parent view — Firestore-backed with real-time onSnapshot.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  decideRequest,
  subscribeParentRequests,
} from '../services/firebaseRequests';
import { AppHeader } from '../components/AppHeader';
import { RequestCard } from '../components/RequestCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Colors, Spacing, Radius, FontSize } from '../styles/theme';
import type { AccessRequest } from '../types';

export default function ParentDashboard() {
  const { user, logout } = useAuth();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Real-time Firestore subscription
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
        // Firestore onSnapshot updates the list automatically
      } catch (err) {
        setDecisionError(err instanceof Error ? err.message : 'Failed to submit decision.');
      } finally {
        setDecidingId(null);
      }
    },
    [user, decidingId]
  );

  const handleApprove = useCallback((id: string) => handleDecision(id, 'approved'), [handleDecision]);
  const handleDeny = useCallback((id: string) => handleDecision(id, 'denied'), [handleDecision]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>No requests</Text>
      <Text style={styles.emptyText}>
        When your child requests access to a website, it will appear here instantly.
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: AccessRequest }) => (
    <RequestCard
      request={item}
      onApprove={handleApprove}
      onDeny={handleDeny}
      decidingId={decidingId}
    />
  );

  return (
    <View style={styles.flex}>
      <AppHeader
        subtitle={`Welcome, ${user?.username ?? 'parent'} 👋`}
        connectionStatus="connected"
        onLogout={logout}
      />

      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryBar}>
          {[
            { label: 'Total', value: requests.length, color: Colors.textPrimary },
            { label: 'Pending', value: pendingCount, color: Colors.pending },
            { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: Colors.approved },
            { label: 'Denied', value: requests.filter(r => r.status === 'denied').length, color: Colors.denied },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryCount, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.summaryDivider} />}
            </React.Fragment>
          ))}
        </View>

        {decisionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{decisionError}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          Access Requests
          {pendingCount > 0 ? <Text style={styles.pendingBadge}> {pendingCount} awaiting</Text> : null}
        </Text>

        {listError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={requests.length === 0 ? styles.listEmpty : undefined}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  container: { flex: 1, padding: Spacing.md },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  summaryCount: { fontSize: FontSize.xl, fontWeight: '700' },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  pendingBadge: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.pending },
  errorBox: { backgroundColor: Colors.deniedBg, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  listEmpty: { flexGrow: 1 },
});
