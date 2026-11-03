/**
 * ChildProtectionStatusScreen.tsx
 *
 * Child — view current protection status: policy from API,
 * heartbeat status from AsyncStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Placeholder child ID — in production this would come from AuthContext or AsyncStorage
const PLACEHOLDER_CHILD_ID = 'demo-child';

interface PolicyData {
  contentCategories?: Record<string, boolean>;
  blockedKeywords?: string[];
  trustedDomains?: string[];
  [key: string]: unknown;
}

export default function ChildProtectionStatusScreen() {
  const router = useRouter();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [heartbeat, setHeartbeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [policyData, heartbeatValue] = await Promise.all([
        apiGet(`/policy/${PLACEHOLDER_CHILD_ID}`).catch(() => null),
        AsyncStorage.getItem('heartbeat_status'),
      ]);
      setPolicy(policyData);
      setHeartbeat(heartbeatValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status.');
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

  const heartbeatColor =
    heartbeat === 'ACTIVE' ? Colors.approved :
    heartbeat === 'OFFLINE' ? Colors.denied :
    Colors.pending;

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Protection Status" onBack={() => router.back()} />
        <LoadingState message="Loading your protection status…" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Protection Status" onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shield hero */}
        <View style={styles.shieldContainer}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.shieldTitle}>GuardianLink Protection</Text>
          <Text style={styles.shieldSubtitle}>Your device is being protected by your guardian.</Text>
        </View>

        {/* Heartbeat status */}
        <Card style={styles.statusCard}>
          <Text style={styles.cardTitle}>Device Connection</Text>
          <View style={styles.heartbeatRow}>
            <View style={[styles.dot, { backgroundColor: heartbeatColor }]} />
            <Text style={[styles.heartbeatText, { color: heartbeatColor }]}>
              {heartbeat ?? 'Unknown'}
            </Text>
          </View>
          {heartbeat === 'ACTIVE' && (
            <Text style={styles.statusHint}>Your device is connected and protection is active.</Text>
          )}
          {heartbeat === 'OFFLINE' && (
            <Text style={[styles.statusHint, { color: Colors.denied }]}>
              Device appears offline. Contact your guardian if this persists.
            </Text>
          )}
          {!heartbeat && (
            <Text style={styles.statusHint}>Status not yet reported. Check back later.</Text>
          )}
        </Card>

        {/* Policy summary */}
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : policy ? (
          <>
            <Card style={styles.policyCard}>
              <Text style={styles.cardTitle}>Active Content Filters</Text>
              {policy.contentCategories &&
                Object.entries(policy.contentCategories as Record<string, boolean>).map(
                  ([cat, enabled]) => (
                    <View key={cat} style={styles.policyRow}>
                      <Text style={styles.policyKey}>{cat}</Text>
                      <StatusBadge
                        label={enabled ? 'Blocked' : 'Allowed'}
                        color={enabled ? Colors.denied : Colors.approved}
                      />
                    </View>
                  )
                )}
              {!policy.contentCategories && (
                <Text style={styles.noDataText}>No content categories configured.</Text>
              )}
            </Card>

            {policy.blockedKeywords && policy.blockedKeywords.length > 0 && (
              <Card style={styles.policyCard}>
                <Text style={styles.cardTitle}>Blocked Keywords</Text>
                <View style={styles.chipsRow}>
                  {policy.blockedKeywords.map((kw: string) => (
                    <View key={kw} style={styles.chip}>
                      <Text style={styles.chipText}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {policy.trustedDomains && policy.trustedDomains.length > 0 && (
              <Card style={styles.policyCard}>
                <Text style={styles.cardTitle}>Trusted Websites</Text>
                <View style={styles.chipsRow}>
                  {policy.trustedDomains.map((d: string) => (
                    <View key={d} style={[styles.chip, styles.chipTrusted]}>
                      <Text style={[styles.chipText, { color: Colors.approved }]}>{d}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.policyCard}>
            <Text style={styles.noDataText}>
              No policy data available. Your guardian may not have configured restrictions yet.
            </Text>
          </Card>
        )}

        <Text style={styles.disclaimer}>
          Protection policies are set by your guardian and reviewed regularly.
          If you have questions, talk to your guardian.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  shieldContainer: {
    alignItems: 'center',
    backgroundColor: NAVY,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  shieldIcon: { fontSize: 56, marginBottom: Spacing.sm },
  shieldTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  shieldSubtitle: {
    fontSize: FontSize.sm,
    color: '#FFFFFF99',
    textAlign: 'center',
  },
  statusCard: { marginBottom: Spacing.md },
  policyCard: { marginBottom: Spacing.md },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heartbeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  heartbeatText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statusHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  policyKey: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  noDataText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  chipTrusted: {
    backgroundColor: Colors.approvedBg,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.denied,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});
