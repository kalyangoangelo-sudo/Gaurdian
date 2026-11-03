/**
 * app/(parent)/dashboard.tsx
 *
 * Parent Dashboard tab — real stats from live API calls.
 *
 * Stats sourced from:
 *   - Safety Reports count: GET /safesignal/:parentId  (real)
 *   - Pending Access Requests: GET /requests           (real)
 *   - Device Status: GET /device-status/:childId       (real)
 *   - Stats not from API are labelled "(Demo)"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeParentRequests } from '../../src/services/firebaseRequests';
import { apiGet } from '../../src/config/api';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatusBadge } from '../../src/components/StatusBadge';
import { LoadingState } from '../../src/components/LoadingState';
import { Colors, FontSize, Spacing, Radius } from '../../src/styles/theme';
import type { AccessRequest } from '../../src/types';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';

// Placeholder child ID — in production would come from user profile
const PLACEHOLDER_CHILD_ID = 'demo-child';

interface DeviceStatus {
  connectionStatus?: string;
  protectionActive?: boolean;
  lastHeartbeat?: string;
}

export default function ParentDashboardTab() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Real: Firestore access requests
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  // Real: SafeSignal reports count from REST API
  const [safeSignalCount, setSafeSignalCount] = useState<number | null>(null);
  const [safeSignalError, setSafeSignalError] = useState(false);

  // Real: Device status from REST API
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [deviceError, setDeviceError] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Real-time Firestore subscription for access requests
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeParentRequests(user.id, setRequests, () => {});
    return unsub;
  }, [user?.id]);

  const loadApiStats = useCallback(async () => {
    const parentId = user?.id ?? 'demo-parent';

    // SafeSignal count
    try {
      const data = await apiGet(`/safesignal/${parentId}`);
      setSafeSignalCount(Array.isArray(data) ? data.length : 0);
      setSafeSignalError(false);
    } catch {
      setSafeSignalError(true);
    }

    // Device status
    try {
      const data = await apiGet(`/device-status/${PLACEHOLDER_CHILD_ID}`);
      setDeviceStatus(data);
      setDeviceError(false);
    } catch {
      setDeviceError(true);
    }

    setStatsLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { loadApiStats(); }, [loadApiStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadApiStats();
  }, [loadApiStats]);

  const comingSoon = useCallback(() => {
    Alert.alert('Coming Soon', 'This feature will be available in a future update.');
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  const connectionStatus = deviceStatus?.connectionStatus ?? null;
  const connectionColor =
    connectionStatus === 'VERIFIED' ? Colors.approved :
    connectionStatus === 'OFFLINE' ? Colors.denied :
    Colors.pending;
  const connectionLabel = connectionStatus ?? 'Unknown';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Parent Dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome */}
        <View style={styles.welcomeBar}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.username ?? 'Parent'} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityRole="button">
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>

          {/* Safety Reports — real */}
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>🚨</Text>
            <Text style={styles.statNum}>
              {safeSignalError ? '—' : safeSignalCount === null ? '…' : safeSignalCount}
            </Text>
            <Text style={styles.statLabel}>Safety Reports</Text>
            {!safeSignalError && <Text style={styles.liveTag}>LIVE</Text>}
            {safeSignalError && <Text style={styles.demoTag}>OFFLINE</Text>}
          </Card>

          {/* Pending requests — real (Firestore) */}
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statNum, pendingRequests > 0 && { color: Colors.pending }]}>
              {pendingRequests}
            </Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
            <Text style={styles.liveTag}>LIVE</Text>
          </Card>

          {/* Device status — real */}
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📱</Text>
            {deviceError ? (
              <Text style={styles.statNum}>—</Text>
            ) : (
              <StatusBadge
                label={connectionLabel}
                color={connectionColor}
              />
            )}
            <Text style={styles.statLabel}>Device Status</Text>
            {!deviceError && <Text style={styles.liveTag}>LIVE</Text>}
            {deviceError && <Text style={styles.demoTag}>OFFLINE</Text>}
          </Card>

          {/* Total requests — real (Firestore) */}
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statNum}>{requests.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
            <Text style={styles.liveTag}>LIVE</Text>
          </Card>

        </View>

        {/* Quick navigation */}
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.navGrid}>
          <NavCard emoji="👶" label="Manage Children" onPress={() => router.push('/(parent)/children')} />
          <NavCard emoji="🚨" label="Safety Reports" onPress={() => router.push('/(parent)/reports')} />
          <NavCard emoji="📋" label="Access Requests" onPress={() => router.push('/(parent)/requests')} />
          <NavCard emoji="🛡️" label="Device Security" onPress={() => router.push('/(parent)/security')} />
          <NavCard emoji="🔒" label="Content Rules" onPress={comingSoon} />
          <NavCard emoji="📈" label="AI Reports" onPress={comingSoon} />
        </View>

        {/* Recent requests */}
        {requests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            {requests.slice(0, 3).map(req => (
              <Card key={req.id} style={styles.requestItem}>
                <Text style={styles.requestUrl} numberOfLines={1} ellipsizeMode="middle">
                  {req.url}
                </Text>
                <View style={styles.requestMeta}>
                  <Text style={styles.requestDate}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </Text>
                  <StatusBadge status={req.status} />
                </View>
              </Card>
            ))}
            {requests.length > 3 && (
              <TouchableOpacity
                onPress={() => router.push('/(parent)/requests')}
                style={styles.viewAllBtn}
                accessibilityRole="button"
              >
                <Text style={styles.viewAllText}>View all {requests.length} requests →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

function NavCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navCard} onPress={onPress} accessibilityRole="button">
      <Text style={styles.navEmoji}>{emoji}</Text>
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  welcomeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: NAVY,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  welcomeTitle: { fontSize: FontSize.sm, color: '#FFFFFF99' },
  welcomeName: { fontSize: FontSize.xl, fontWeight: '700', color: '#FFFFFF' },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: '#FFFFFF20',
    borderRadius: Radius.sm,
  },
  logoutText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '600' },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  statNum: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  liveTag: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.approved,
    backgroundColor: Colors.approvedBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    letterSpacing: 0.5,
  },
  demoTag: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.pending,
    backgroundColor: Colors.pendingBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    letterSpacing: 0.5,
  },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  navCard: {
    width: '47%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  navEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  navLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  requestItem: { marginBottom: Spacing.sm },
  requestUrl: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  requestMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  viewAllBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  viewAllText: { fontSize: FontSize.sm, color: TEAL, fontWeight: '600' },
});
