/**
 * ParentDeviceSecurityScreen.tsx
 *
 * Parent — view device security status.
 * Loads from GET /device-status/:childId.
 * Shows VERIFIED / OFFLINE / UNVERIFIED badges.
 *
 * ⚠️ DISCLAIMER: OS-level enforcement (screen lock, VPN enforcement,
 * MDM restrictions) is not implemented. Status reflects heartbeat signals only.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet } from '../config/api';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';
const PLACEHOLDER_CHILD_ID = 'demo-child';

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
  [key: string]: unknown;
}

const statusColors: Record<ConnectionStatus, string> = {
  VERIFIED:   Colors.approved,
  OFFLINE:    Colors.denied,
  UNVERIFIED: Colors.pending,
};

const statusDescriptions: Record<ConnectionStatus, string> = {
  VERIFIED:   'Device is online and heartbeat is current.',
  OFFLINE:    'Device has not reported in. Check the child\'s device.',
  UNVERIFIED: 'Device has registered but could not be fully verified.',
};

export default function ParentDeviceSecurityScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet(`/device-status/${PLACEHOLDER_CHILD_ID}`);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device status.');
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

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Device Security" onBack={() => router.back()} />
        <LoadingState message="Loading device status…" />
      </View>
    );
  }

  const connectionStatus: ConnectionStatus =
    (status?.connectionStatus as ConnectionStatus) ?? 'UNVERIFIED';
  const statusColor = statusColors[connectionStatus];

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Device Security" onBack={() => router.back()} />
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
          <Text style={styles.heroDesc}>
            {statusDescriptions[connectionStatus]}
          </Text>
        </Card>

        {/* Device details */}
        {status && (
          <Card style={styles.detailCard}>
            <Text style={styles.cardTitle}>Device Details</Text>
            <DetailRow label="Last Heartbeat" value={
              status.lastHeartbeat
                ? new Date(status.lastHeartbeat as string).toLocaleString()
                : 'No data'
            } />
            <DetailRow label="Device Model" value={String(status.deviceModel ?? '—')} />
            <DetailRow label="OS Version" value={String(status.osVersion ?? '—')} />
            <DetailRow label="App Version" value={String(status.appVersion ?? '—')} />
          </Card>
        )}

        {/* Protection status */}
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
              label="Pending Removal Requests"
              value={String(status.pendingRemovalRequests ?? 0)}
              valueColor={
                (status.pendingRemovalRequests ?? 0) > 0 ? Colors.pending : Colors.textPrimary
              }
            />
            <DetailRow
              label="Protection Interruptions"
              value={String(status.protectionInterruptions ?? 0)}
              valueColor={
                (status.protectionInterruptions ?? 0) > 0 ? Colors.denied : Colors.approved
              }
            />
          </Card>
        )}

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            OS-level enforcement (such as VPN enforcement, screen time limits,
            or MDM restrictions) is <Text style={styles.bold}>not implemented</Text> in this version.
          </Text>
          <Text style={styles.disclaimerText}>
            Status shown here reflects heartbeat signals from the GuardianLink app only.
            A child with sufficient technical knowledge could uninstall the app
            unless OS-level restrictions are separately configured.
          </Text>
          <Text style={styles.disclaimerText}>
            Parental controls at the device OS level (e.g., Android Digital Wellbeing
            or Family Link) provide stronger enforcement.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function DetailRow({ label, value, valueColor }: DetailRowProps) {
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
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  heroCard: {
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shieldIcon: { fontSize: 36, marginRight: Spacing.md },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  heroDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  detailCard: { marginBottom: Spacing.md },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  disclaimerCard: {
    marginBottom: Spacing.md,
    backgroundColor: '#FFFBEB',
    borderColor: Colors.pending,
    borderWidth: 1,
  },
  disclaimerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.pending,
    marginBottom: Spacing.sm,
  },
  disclaimerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  bold: { fontWeight: '700', color: Colors.textPrimary },
});
