/**
 * CaseworkerDashboardScreen.tsx
 *
 * Dashboard for caseworkers — lists all cases with filtering and pull-to-refresh.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

type Priority = 'CRITICAL' | 'HIGH' | 'STANDARD';
type Status = 'new' | 'open' | 'escalated' | 'closed' | 'resolved';

interface CaseItem {
  id: string;
  caseRef: string;
  category: string;
  aiResult?: { suggestedPriority?: Priority };
  humanPriority?: Priority;
  status: Status;
  submittedByRole?: string;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: Colors.deniedBg, text: Colors.denied },
  HIGH: { bg: Colors.pendingBg, text: Colors.pending },
  STANDARD: { bg: Colors.blueLight, text: Colors.blue },
};

const STATUS_FILTERS: Array<Status | 'all'> = ['all', 'new', 'open', 'escalated', 'closed'];
const PRIORITY_FILTERS: Array<Priority | 'all'> = ['all', 'CRITICAL', 'HIGH', 'STANDARD'];

export default function CaseworkerDashboardScreen() {
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const fetchCases = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const token = await AsyncStorage.getItem('caseworker_token');
      if (!token) {
        router.replace('/caseworker-login' as any);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        await AsyncStorage.removeItem('caseworker_token');
        router.replace('/caseworker-login' as any);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCases(Array.isArray(data) ? data : data.cases ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem('caseworker_token');
    router.replace('/caseworker-login' as any);
  }, [router]);

  const filteredCases = cases.filter((c) => {
    const effectivePriority = c.humanPriority ?? c.aiResult?.suggestedPriority;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || effectivePriority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const renderPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const colors = PRIORITY_COLORS[priority] ?? { bg: Colors.blueLight, text: Colors.blue };
    return (
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.badgeText, { color: colors.text }]}>{priority}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: CaseItem }) => {
    const effectivePriority = item.humanPriority ?? item.aiResult?.suggestedPriority;
    return (
      <TouchableOpacity
        style={styles.caseCard}
        onPress={() => router.push({ pathname: '/case-detail' as any, params: { id: item.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Case ${item.caseRef}`}
      >
        <View style={styles.caseRow}>
          <Text style={styles.caseRef}>{item.caseRef}</Text>
          {renderPriorityBadge(effectivePriority)}
        </View>
        <Text style={styles.caseCategory}>{item.category}</Text>
        <View style={styles.caseRow}>
          <Text style={styles.caseMeta}>Status: <Text style={styles.caseMetaVal}>{item.status}</Text></Text>
          {item.submittedByRole ? (
            <Text style={styles.caseMeta}>Role: <Text style={styles.caseMetaVal}>{item.submittedByRole}</Text></Text>
          ) : null}
        </View>
        <Text style={styles.caseDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.emptyTitle}>No cases found</Text>
      <Text style={styles.emptyText}>
        {statusFilter !== 'all' || priorityFilter !== 'all'
          ? 'Try clearing filters.'
          : 'No cases have been submitted yet.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Loading cases…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡 Cases</Text>
          <Text style={styles.headerSub}>{filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>STATUS</Text>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterChipText, statusFilter === item && styles.filterChipTextActive]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterRow}
        />
      </View>

      {/* Priority filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>PRIORITY</Text>
        <FlatList
          horizontal
          data={PRIORITY_FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, priorityFilter === item && styles.filterChipActive]}
              onPress={() => setPriorityFilter(item)}
            >
              <Text style={[styles.filterChipText, priorityFilter === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterRow}
        />
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Cases list */}
      <FlatList
        data={filteredCases}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filteredCases.length === 0 ? styles.listEmpty : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCases(true)}
            colors={[Colors.blue]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundPage },
  loadingText: { marginTop: Spacing.sm, fontSize: FontSize.md, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: FontSize.sm, color: Colors.textMuted },
  logoutBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  logoutBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.white },
  filterSection: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  filterRow: { gap: Spacing.xs, paddingBottom: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  filterChipActive: { borderColor: Colors.blue, backgroundColor: Colors.blueLight },
  filterChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.blue },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    margin: Spacing.md,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  listEmpty: { flexGrow: 1 },
  caseCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  caseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  caseRef: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  caseCategory: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  caseMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  caseMetaVal: { fontWeight: '600', color: Colors.textPrimary },
  caseDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
});
