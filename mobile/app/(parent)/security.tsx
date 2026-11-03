/**
 * app/(parent)/security.tsx
 *
 * Parent Security tab — view device security status and manage removal requests.
 * Device status: real from GET /device-status/:childId
 * Removal requests: real from GET /removal-requests/:parentId
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet, apiPut } from '../../src/config/api';
import { Card } from '../../src/components/Card';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatusBadge } from '../../src/components/StatusBadge';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, FontSize, Spacing, Radius } from '../../src/styles/theme';

const PLACEHOLDER_CHILD_ID = 'demo-child';
const AUTO_REFRESH_MS = 30_000;

type ConnectionStatus = 'VERIFIED' | 'OFFLINE' | 'UNVERIFIED';

interface DeviceStatus {
  connectionStatus?: ConnectionStatus;
  lastHeartbeat?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  protectionActive?: boolean;
  uninstallProtection?: boolean;
  pendingRemovalRequests?: number;
  protectionInterruptions?: number;
}

interface RemovalRequest {
  id: string;
  reason: string;
  status?: string;
  createdAt?: string;
}

const statusColors: Record<ConnectionStatus, string> = {
  VERIFIED:   Colors.approved,
  OFFLINE:    Colors.denied,
  UNVERIFIED: Colors.pending,
};

export default function ParentSecurityTab() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [removals, setRemovals] = useState<RemovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const parentId = user?.id ?? 'demo-parent';
    try {
      const [deviceData, removalData] = await Promise.allSettled([
        apiGet(`/device-status/${PLACEHOLDER_CHILD_ID}`),
        apiGet(`/removal-requests/${parentId}`),
      ]);
      if (deviceData.status === 'fulfilled') setStatus(deviceData.value);
      if (removalData.status === 'fulfilled') {
        setRemovals(Array.isArray(removalData.value) ? removalData.value : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleRemovalDecide = useCallback(async (id: string, decision: 'approved' | 'denied') => {
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
            onPress: () => submitRemovalDecision(id, decision),
          },
        ]
      );
    } else {
      submitRemovalDecision(id, decision);
    }
  }, [decidingId]);

  const submitRemovalDecision = useCallback(async (id: string, decision: 'approved' | 'denied') => {
    setDecidingId(id);
    try {
      await apiPut(`/removal-request/${id}/decide`, { decision });
      setRemovals(prev => prev.map(r => r.id === id ? { ...r, status: decision } : r));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit decision.');
    } finally {
      setDecidingId(null);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Device Security" />
        <LoadingState message="Loading device status…" />
      </View>
    );
  }

  const connectionStatus: ConnectionStatus =
    (status?.connectionStatus as ConnectionStatus) ?? 'UNVERIFIED';
  const statusColor = statusColors[connectionStatus];

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Device Security" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : null}

        {/* Status hero */}
        <Card style={[styles.heroCard, { borderColor: statusColor }]}>
          <View style={styles.heroRow}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Connection Status</Text>
              <StatusBadge label={connectionStatus} color={statusColor} />
            </View>
          </View>
          {status?.lastHeartbeat && (
            <Text style={styles.heroDesc}>
              Last heartbeat: {new Date(status.lastHeartbeat).toLocaleString()}
            </Text>
          )}
        </Card>

        {/* Protection details */}
        {status && (
          <Card style={styles.detailCard}>
            <Text style={styles.cardTitle}>Protection Status</Text>
            <DetailRow
              label="Protection Active"
              value={status.protectionActive ? 'Yes' : 'No'}
              valueColor={status.protectionActive ? Colors.approved : Colors.denied}
            />
            <DetailRow
              label="Uninstall Protection"
              value={status.uninstallProtection ? 'Enabled' : 'Not Enabled'}
              valueColor={status.uninstallProtection ? Colors.approved : Colors.pending}
            />
            <DetailRow
              label="Protection Interruptions"
              value={String(status.protectionInterruptions ?? 0)}
              valueColor={
                (status.protectionInterruptions ?? 0) > 0 ? Colors.denied : Colors.approved
              }
            />
            <DetailRow label="Device Model" value={String(status.deviceModel ?? '—')} />
            <DetailRow label="App Version" value={String(status.appVersion ?? '—')} />
          </Card>
        )}

        {/* Removal requests */}
        <Text style={styles.sectionTitle}>
          Removal Requests
          {removals.filter(r => !r.status || r.status === 'pending').length > 0 && (
            <Text style={styles.pendingBadge}>
              {' '}{removals.filter(r => !r.status || r.status === 'pending').length} pending
            </Text>
          )}
        </Text>
        {removals.length === 0 ? (
          <Card>
            <Text style={styles.noData}>No removal requests from your child.</Text>
          </Card>
        ) : (
          removals.map(req => {
            const isPending = !req.status || req.status === 'pending';
            const isDeciding = decidingId === req.id;
            const statusLabel = req.status ?? 'pending';
            const statusColor2 =
              statusLabel === 'approved' ? Colors.approved :
              statusLabel === 'denied' ? Colors.denied :
              Colors.pending;

            return (
              <Card key={req.id} style={styles.removalCard}>
                <View style={styles.removalHeader}>
                  <Text style={styles.removalTitle}>Removal Request</Text>
                  <StatusBadge label={statusLabel} color={statusColor2} />
                </View>
                {req.createdAt && (
                  <Text style={styles.date}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </Text>
                )}
                <Text style={styles.reason}>"{req.reason}"</Text>
                {isPending && (
                  <View style={styles.actionRow}>
                    <PrimaryButton
                      label="Approve Removal"
                      variant="danger"
                      onPress={() => handleRemovalDecide(req.id, 'approved')}
                      loading={isDeciding}
                      disabled={!!decidingId}
                      style={styles.actionBtn}
                    />
                    <PrimaryButton
                      label="Deny"
                      variant="success"
                      onPress={() => handleRemovalDecide(req.id, 'denied')}
                      loading={isDeciding}
                      disabled={!!decidingId}
                      style={styles.actionBtn}
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            OS-level enforcement (VPN enforcement, screen time limits, MDM restrictions) is{' '}
            <Text style={styles.bold}>not implemented</Text> in this version. Status reflects
            heartbeat signals from the GuardianLink app only.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1 },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  heroCard: { marginBottom: Spacing.md, borderWidth: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  shieldIcon: { fontSize: 36, marginRight: Spacing.md },
  heroText: { flex: 1 },
  heroTitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xs },
  heroDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  detailCard: { marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  pendingBadge: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.pending },
  noData: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  removalCard: { marginBottom: Spacing.sm },
  removalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  removalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.xs },
  reason: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { flex: 1 },
  disclaimerCard: { marginBottom: Spacing.md, backgroundColor: '#FFFBEB', borderColor: Colors.pending, borderWidth: 1 },
  disclaimerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.pending, marginBottom: Spacing.sm },
  disclaimerText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  bold: { fontWeight: '700', color: Colors.textPrimary },
});
