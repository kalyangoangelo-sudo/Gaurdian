/**
 * app/index.tsx
 *
 * Entry point — role selection screen.
 *
 * On mount:
 *   1. Checks AsyncStorage for 'auth_token' + 'user_role'.
 *   2. If found, redirects to the appropriate tab group.
 *   3. If not logged in, shows the navy role-selection screen.
 *
 * Tapping a role card navigates to /login with the chosen role pre-selected.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';
const WHITE = '#FFFFFF';
const CARD_BG = '#F5F7FA';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [token, role] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('user_role'),
        ]);
        if (!mounted) return;

        if (token && role) {
          // Already authenticated — redirect to the matching tab group
          if (role === 'parent') {
            router.replace('/(parent)/dashboard');
          } else {
            router.replace('/(child)/home');
          }
          return;
        }
      } catch {
        // Storage read failed — fall through to role selection
      }
      if (mounted) setChecking(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashShield}>🛡</Text>
        <Text style={styles.splashTitle}>GuardianLink</Text>
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Branding */}
      <View style={styles.brandSection}>
        <Text style={styles.shield}>🛡</Text>
        <Text style={styles.title}>GuardianLink</Text>
        <Text style={styles.subtitle}>Child Safety Platform</Text>
      </View>

      {/* Role cards */}
      <Text style={styles.prompt}>Who are you?</Text>

      <TouchableOpacity
        style={styles.roleCard}
        onPress={() => router.push({ pathname: '/login', params: { role: 'parent' } })}
        accessibilityRole="button"
        accessibilityLabel="I am a Parent"
      >
        <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
        <View style={styles.roleText}>
          <Text style={styles.roleTitle}>I am a Parent</Text>
          <Text style={styles.roleDesc}>Monitor and protect your child's device</Text>
        </View>
        <Text style={styles.roleArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.roleCard}
        onPress={() => router.push({ pathname: '/login', params: { role: 'child' } })}
        accessibilityRole="button"
        accessibilityLabel="I am a Child"
      >
        <Text style={styles.roleEmoji}>🧒</Text>
        <View style={styles.roleText}>
          <Text style={styles.roleTitle}>I am a Child</Text>
          <Text style={styles.roleDesc}>View your protection and request access</Text>
        </View>
        <Text style={styles.roleArrow}>›</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        GuardianLink keeps children safe online with parental oversight.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashShield: { fontSize: 64, marginBottom: 16 },
  splashTitle: { fontSize: 28, fontWeight: '700', color: WHITE, letterSpacing: 0.5 },
  container: {
    flex: 1,
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  shield: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: TEAL,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  prompt: {
    fontSize: 14,
    color: WHITE + 'AA',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  roleCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleEmoji: { fontSize: 36, marginRight: 16 },
  roleText: { flex: 1 },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  roleArrow: {
    fontSize: 28,
    color: NAVY + '44',
    fontWeight: '300',
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 12,
    color: WHITE + '66',
    textAlign: 'center',
    lineHeight: 18,
  },
});
