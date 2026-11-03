/**
 * app/(child)/home.tsx
 *
 * Child Home tab — shows welcome, quick actions, and request status overview.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { usersRef } from '../../src/services/firebase';
import { subscribeChildRequests } from '../../src/services/firebaseRequests';
import {
  getOrCreateDeviceId,
  startHeartbeat,
  stopHeartbeat,
} from '../../src/services/heartbeatService';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Colors, FontSize, Spacing, Radius } from '../../src/styles/theme';
import type { AccessRequest } from '../../src/types';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';

export default function ChildHomeTab() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    usersRef().doc(user.id).get().then(snap => {
      setParentId(snap.data()?.parentId ?? null);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeChildRequests(user.id, setRequests, () => {});
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const token = await AsyncStorage.getItem('auth_token');
      if (active && token) {
        startHeartbeat(deviceId, '1.0', token);
      }
    })();
    return () => {
      active = false;
      stopHeartbeat();
    };
  }, []);

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  const comingSoon = useCallback(() => {
    Alert.alert('Coming Soon', 'This feature will be available in a future update.');
  }, []);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="GuardianLink" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroShield}>🛡️</Text>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Hi, {user?.username ?? 'there'}!</Text>
            <Text style={styles.heroSub}>Your device is protected.</Text>
          </View>
        </View>

        {/* Stats row */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{requests.length}</Text>
              <Text style={styles.statLbl}>Total Requests</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: Colors.pending }]}>{pending}</Text>
              <Text style={styles.statLbl}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: Colors.approved }]}>{approved}</Text>
              <Text style={styles.statLbl}>Approved</Text>
            </View>
          </View>
        </Card>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            emoji="📋"
            label="Request Access"
            onPress={() => router.push('/(child)/requests')}
          />
          <QuickAction
            emoji="🚨"
            label="Report Concern"
            onPress={() => router.push('/(child)/report')}
          />
          <QuickAction
            emoji="🛡️"
            label="Protection Status"
            onPress={() => router.push('/(child)/protection')}
          />
          <QuickAction
            emoji="❓"
            label="Safety Tips"
            onPress={comingSoon}
          />
        </View>

        {/* Status */}
        <Card style={styles.statusCard}>
          <Text style={styles.statusTitle}>Account Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Guardian linked</Text>
            <StatusBadge
              label={parentId ? 'Connected' : 'Not linked'}
              color={parentId ? Colors.approved : Colors.pending}
            />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Protection</Text>
            <StatusBadge label="Active" color={Colors.approved} />
          </View>
        </Card>

        {/* Logout */}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityRole="button">
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function QuickAction({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} accessibilityRole="button">
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  heroBanner: {
    backgroundColor: NAVY,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroShield: { fontSize: 48, marginRight: Spacing.md },
  heroText: { flex: 1 },
  heroTitle: { fontSize: FontSize.xl, fontWeight: '700', color: '#FFFFFF' },
  heroSub: { fontSize: FontSize.sm, color: TEAL, marginTop: 2 },
  statsCard: { marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  statNum: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  statLbl: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  actionEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  actionLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  statusCard: { marginBottom: Spacing.md },
  statusTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  logoutBtn: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  logoutText: { fontSize: FontSize.sm, color: Colors.denied, fontWeight: '600' },
});
