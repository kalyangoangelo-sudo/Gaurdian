/**
 * ParentManageChildScreen.tsx
 *
 * Parent — generate a 6-digit pairing code with a 30-minute countdown timer.
 * POST /pair/generate → { code: string }
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiPost } from '../config/api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';
const EXPIRY_SECONDS = 30 * 60; // 30 minutes

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ParentManageChildScreen() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setSecondsLeft(EXPIRY_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          setCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    stopTimer();
    setCode(null);
    try {
      const result = await apiPost('/pair/generate', {});
      const receivedCode: string = result?.code ?? String(result);
      setCode(receivedCode);
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pairing code.');
    } finally {
      setGenerating(false);
    }
  }, [startTimer, stopTimer]);

  const isExpired = code === null && secondsLeft === 0;
  const isActive = code !== null && secondsLeft > 0;
  const urgentCountdown = secondsLeft > 0 && secondsLeft <= 60;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Manage Child Device" onBack={() => router.back()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Instructions */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔗 Pair a Child Device</Text>
          <Text style={styles.infoText}>
            Generate a 6-digit pairing code and enter it on the child device within
            30 minutes. The code expires automatically for security.
          </Text>
          <Text style={styles.infoText}>
            Each code can only be used once. Generate a new code if the current one expires.
          </Text>
        </Card>

        {/* Code display */}
        {isActive && code ? (
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Pairing Code</Text>
            <View style={styles.codeDisplay}>
              {code.split('').map((digit, i) => (
                <View key={i} style={styles.digitBox}>
                  <Text style={styles.digit}>{digit}</Text>
                </View>
              ))}
            </View>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownLabel}>Expires in</Text>
              <Text
                style={[
                  styles.countdownValue,
                  urgentCountdown && styles.countdownUrgent,
                ]}
              >
                {formatCountdown(secondsLeft)}
              </Text>
            </View>
            {urgentCountdown && (
              <Text style={styles.urgentText}>⚠️ Code expiring soon — enter it now!</Text>
            )}
          </Card>
        ) : null}

        {/* Generate button */}
        <PrimaryButton
          label={isActive ? 'Regenerate Code' : 'Generate Pairing Code'}
          onPress={handleGenerate}
          loading={generating}
          style={styles.generateBtn}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Instructions after code */}
        {isActive && (
          <Card style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Next Steps</Text>
            <Text style={styles.step}>1. Open GuardianLink on the child device.</Text>
            <Text style={styles.step}>2. Tap "Set Up as Child Device".</Text>
            <Text style={styles.step}>3. Enter the 6-digit code shown above.</Text>
            <Text style={styles.step}>4. Protection will activate automatically.</Text>
          </Card>
        )}

        <Text style={styles.disclaimer}>
          Pairing codes are single-use and expire after 30 minutes.
          Keep this code private and only share it with the intended device.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  infoCard: { marginBottom: Spacing.md, backgroundColor: '#EBF8FF' },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: NAVY,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  codeCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    backgroundColor: NAVY,
  },
  codeLabel: {
    fontSize: FontSize.sm,
    color: '#FFFFFF99',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  codeDisplay: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  digitBox: {
    width: 44,
    height: 56,
    backgroundColor: '#FFFFFF15',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: FontSize.xxxl ?? 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countdownLabel: {
    fontSize: FontSize.sm,
    color: '#FFFFFF99',
  },
  countdownValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: TEAL,
  },
  countdownUrgent: {
    color: Colors.denied,
  },
  urgentText: {
    fontSize: FontSize.sm,
    color: Colors.denied,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  generateBtn: { marginBottom: Spacing.md },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  stepsCard: { marginBottom: Spacing.md },
  stepsTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
