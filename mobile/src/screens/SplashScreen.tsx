/**
 * SplashScreen.tsx
 *
 * Shown while Firebase restores the auth session on app launch.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../styles/theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.shield}>🛡</Text>
      <Text style={styles.title}>GuardianLink Lite</Text>
      <ActivityIndicator size="large" color={Colors.blue} style={styles.spinner} />
      <Text style={styles.subtitle}>Restoring session…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: { fontSize: 64, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: Spacing.xl,
  },
  spinner: { marginBottom: Spacing.md },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.white + '99',
  },
});
