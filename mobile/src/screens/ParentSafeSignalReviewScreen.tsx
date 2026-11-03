/**
 * ParentSafeSignalReviewScreen.tsx
 *
 * Parent — review child SafeSignal submissions.
 * Runs local triage on each report and shows risk levels.
 * Acknowledge → PUT /safesignal/:id/acknowledge
 * "Report to Authority" → simulated Alert.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPut } from '../config/api';
import { triageSignal, TriageResult } from '../services/safeSignalTriage';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

const NAVY = '#1B2A4A';
const PLACEHOLDER_PARENT_ID = 'demo-parent';

interface SafeSignalReport {
  id: string;
  category: string;
  description: string;
  submittedText?: string;
  status?: string;
  createdAt?: string;
}

interface ExpandedReport {
  report: SafeSignalReport;
  triage: TriageResult;
}

const riskColors: Record<string, string> = {
  HIGH:   Colors.denied,
  MEDIUM: Colors.pending,
  LOW:    Colors.approved,
};

export default function ParentSafeSignalReviewScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<SafeSignalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet(`/safesignal/${PLACEHOLDER_PARENT_ID}`);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
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

  const handleAcknowledge = useCallback(async (id: string) => {
    setAcknowledging(id);
    try {
      await apiPut(`/safesignal/${id}/acknowledge`, { action: 'Reviewed' });
      setReports(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'Reviewed' } : r)
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to acknowledge.');
    } finally {
      setAcknowledging(null);
    }
  }, []);

  const handleReportToAuthority = useCallback((report: SafeSignalReport) => {
    Alert.alert(
      '⚠️ Report to Authority (SIMULATED)',
      `This would submit report "${report.id}" (${report.category}) to the relevant child safety authority.\n\nIn a production environment, this would connect to a certified reporting portal such as the National Center for Missing & Exploited Children (NCMEC) or local child protection services.\n\nThis is a demonstration only — no data has been transmitted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Report',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Simulated', 'Report acknowledged as submitted to authorities (DEMO ONLY).'),
        },
      ]
    );
  }, []);

  const getExpandedData = useCallback((report: SafeSignalReport): ExpandedReport => ({
    report,
    triage: triageSignal({
      category: report.category,
      description: report.description,
      submittedText: report.submittedText,
    }),
  }), []);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="SafeSignal Reports" onBack={() => router.back()} />
        <LoadingState message="Loading safety reports…" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: SafeSignalReport }) => {
    const isExpanded = expandedId === item.id;
    const expanded = isExpanded ? getExpandedData(item) : null;
    const riskLevel = expanded?.triage.riskLevel ?? null;
    const riskColor = riskLevel ? riskColors[riskLevel] : Colors.textMuted;
    const isAcknowledged = item.status === 'Reviewed';

    return (
      <Card style={styles.reportCard}>
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Toggle details for report ${item.id}`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.reportHeader}>
            <View style={styles.reportMeta}>
              <Text style={styles.reportCategory}>{item.category}</Text>
              {item.createdAt && (
                <Text style={styles.reportDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={styles.reportBadges}>
              {isAcknowledged && (
                <StatusBadge label="Reviewed" color={Colors.approved} />
              )}
              <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
          <Text style={styles.reportDesc} numberOfLines={isExpanded ? undefined : 2}>
            {item.description}
          </Text>
        </TouchableOpacity>

        {isExpanded && expanded && (
          <View style={styles.expandedContent}>
            {/* Triage result */}
            <View style={[styles.riskBanner, { backgroundColor: riskColor + '20' }]}>
              <Text style={[styles.riskLabel, { color: riskColor }]}>
                Risk Level: {expanded.triage.riskLevel}
              </Text>
              {expanded.triage.requiresImmediateAttention && (
                <Text style={styles.urgentText}>⚠️ Requires Immediate Attention</Text>
              )}
            </View>

            {expanded.triage.classificationResult.classification !== 'SAFE' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Classification</Text>
                <Text style={styles.sectionValue}>
                  {expanded.triage.classificationResult.classification}
                  {' '}({expanded.triage.classificationResult.uncertaintyLevel})
                </Text>
              </View>
            )}

            {expanded.triage.classificationResult.indicators.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Indicators Detected</Text>
                {expanded.triage.classificationResult.indicators.map((ind, i) => (
                  <Text key={i} style={styles.bulletItem}>• {ind}</Text>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Actions</Text>
              {expanded.triage.recommendedActions.map((action, i) => (
                <Text key={i} style={styles.bulletItem}>• {action}</Text>
              ))}
            </View>

            {item.submittedText ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Submitted Content</Text>
                <View style={styles.submittedTextBox}>
                  <Text style={styles.submittedText}>{item.submittedText}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {!isAcknowledged && (
                <PrimaryButton
                  label="Acknowledge"
                  variant="success"
                  onPress={() => handleAcknowledge(item.id)}
                  loading={acknowledging === item.id}
                  disabled={!!acknowledging}
                  style={styles.actionBtn}
                />
              )}
              <PrimaryButton
                label="Report to Authority"
                variant="danger"
                onPress={() => handleReportToAuthority(item)}
                disabled={!!acknowledging}
                style={styles.actionBtn}
              />
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="SafeSignal Reports" onBack={() => router.back()} />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No SafeSignal Reports</Text>
              <Text style={styles.emptyText}>
                Your child has not submitted any safety concerns yet.
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
  reportCard: { marginBottom: Spacing.sm },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  reportMeta: { flex: 1 },
  reportBadges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  reportCategory: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reportDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reportDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  expandedContent: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  riskBanner: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  riskLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  urgentText: {
    fontSize: FontSize.sm,
    color: Colors.denied,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  section: { marginBottom: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  bulletItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  submittedTextBox: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submittedText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
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
