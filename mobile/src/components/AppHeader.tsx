/**
 * AppHeader.tsx
 *
 * Top bar with branding, Firebase live indicator, and logout.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '../styles/theme';

interface Props {
  subtitle: string;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting' | 'error';
  onLogout: () => void;
}

export function AppHeader({ subtitle, connectionStatus = 'connected', onLogout }: Props) {
  const isLive = connectionStatus === 'connected';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brand}>🛡 GuardianLink Lite</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          onPress={onLogout}
          style={styles.logoutBtn}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {/* Firebase live indicator */}
      <View style={[styles.badge, { backgroundColor: isLive ? Colors.approved + '33' : Colors.denied + '33' }]}>
        <Text style={[styles.badgeText, { color: isLive ? Colors.approved : Colors.denied }]}>
          {isLive ? '🔥 Firebase Live' : '○ Offline'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  brand: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textOnPrimary + 'BB',
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.textOnPrimary + '55',
  },
  logoutText: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
