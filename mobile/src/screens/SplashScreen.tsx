/**
 * SplashScreen.tsx
 *
 * Shown while Firebase restores the auth session on app launch.
 * Supports English / Luganda via useTranslation.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';

export default function SplashScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.shield}>🛡</Text>
      <Text style={styles.title}>{t('brand_name')}</Text>
      <ActivityIndicator size="large" color={Colors.blue} style={styles.spinner} />
      <Text style={styles.subtitle}>{t('restoring_session')}</Text>
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
