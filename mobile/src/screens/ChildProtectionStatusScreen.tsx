/**
 * ChildProtectionStatusScreen.tsx
 *
 * Child — view current protection status: policy from API,
 * heartbeat status from heartbeatService (refreshed every 30 s).
 * Supports English / Luganda via useTranslation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet } from '../config/api';
import { getHeartbeatStatus } from '../services/heartbeatService';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';

const NAVY = '#1B2A4A';
const REFRESH_INTERVAL_MS = 30_000;

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
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [heartbeatStatus, setHeartbeatStatus] = useState<string | null>(null);
  const [heartbeatLastSent, setHeartbeatLastSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHeartbeat = useCallback(async () => {
    const hb = await getHeartbeatStatus();
    setHeartbeatStatus(hb.status);
    setHeartbeatLastSent(hb.lastSent);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [policyData] = await Promise.all([
        apiGet(`/policy/${PLACEHOLDER_CHILD_ID}`).catch(() => null),
        loadHeartbeat(),
      ]);
      setPolicy(policyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('label_loading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadHeartbeat, t]);

  useEffect(() => { load(); }, [load]);

  // Refresh heartbeat status every 30 seconds
  useEffect(() => {
    const id = setInterval(loadHeartbeat, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadHeartbeat]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const isActive = heartbeatStatus === 'ACTIVE';
  const heartbeatColor = isActive ? Colors.approved : Colors.pending;
  const heartbeatLabel = isActive ? t('status_active') : t('status_unknown');

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('protection_status_title')} onBack={() => router.back()} />
        <LoadingState message={t('loading_protection_status')} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('protection_status_title')} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shield hero */}
        <View style={styles.shieldContainer}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.shieldTitle}>{t('shield_title')}</Text>
          <Text style={styles.shieldSubtitle}>{t('shield_subtitle')}</Text>
        </View>

        {/* Heartbeat status */}
        <Card style={styles.statusCard}>
          <Text style={styles.cardTitle}>{t('device_connection')}</Text>
          <View style={styles.heartbeatRow}>
            <View style={[styles.dot, { backgroundColor: heartbeatColor }]} />
            <StatusBadge label={heartbeatLabel} color={heartbeatColor} />
          </View>
          {heartbeatLastSent ? (
            <Text style={styles.statusHint}>
              Last reported: {new Date(heartbeatLastSent).toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.statusHint}>{t('status_not_reported')}</Text>
          )}
          {isActive && (
            <Text style={styles.statusHint}>{t('device_connected')}</Text>
          )}
        </Card>

        {/* Policy summary */}
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : policy ? (
          <>
            <Card style={styles.policyCard}>
              <Text style={styles.cardTitle}>{t('active_content_filters')}</Text>
              {policy.contentCategories &&
                Object.entries(policy.contentCategories as Record<string, boolean>).map(
                  ([cat, enabled]) => (
                    <View key={cat} style={styles.policyRow}>
                      <Text style={styles.policyKey}>{cat}</Text>
                      <StatusBadge
                        label={enabled ? t('status_blocked') : t('status_allowed')}
                        color={enabled ? Colors.denied : Colors.approved}
                      />
                    </View>
                  )
                )}
              {!policy.contentCategories && (
                <Text style={styles.noDataText}>{t('no_content_categories')}</Text>
              )}
            </Card>

            {policy.blockedKeywords && policy.blockedKeywords.length > 0 && (
              <Card style={styles.policyCard}>
                <Text style={styles.cardTitle}>{t('blocked_keywords')}</Text>
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
                <Text style={styles.cardTitle}>{t('trusted_websites')}</Text>
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
            <Text style={styles.noDataText}>{t('no_policy_data')}</Text>
          </Card>
        )}

        <Text style={styles.disclaimer}>{t('protection_disclaimer')}</Text>
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
