/**
 * CaseStatusScreen.tsx
 *
 * Check the status of an anonymous report using caseRef + recoverySecret.
 * No auth required.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';
import { ScreenHeader } from '../components/ScreenHeader';

interface CaseStatusResult {
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function CaseStatusScreen() {
  const router = useRouter();
  const { t, lang, setLang } = useTranslation();

  const [caseRef, setCaseRef] = useState('');
  const [recoverySecret, setRecoverySecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaseStatusResult | null>(null);

  const handleSubmit = useCallback(async () => {
    const ref = caseRef.trim().toUpperCase();
    const secret = recoverySecret.trim();
    if (ref.length !== 8 || !secret) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseRef: ref, recoverySecret: secret }),
      });

      if (response.status === 401) {
        setError(t('invalid_case_ref_or_secret'));
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult({
        status: data.status ?? '-',
        category: data.category ?? '-',
        createdAt: data.createdAt ?? '-',
        updatedAt: data.updatedAt ?? '-',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check case status.');
    } finally {
      setLoading(false);
    }
  }, [caseRef, recoverySecret, t]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={t('check_case_status')} onBack={() => router.back()} />

      {/* Language toggle */}
      <View style={styles.langRow}>
        <TouchableOpacity
          style={styles.langToggle}
          onPress={() => setLang(lang === 'en' ? 'lg' : 'en')}
          accessibilityRole="button"
          accessibilityLabel={t('language_toggle')}
        >
          <Text style={styles.langToggleText}>{t('language_toggle')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>{t('case_ref_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enter_case_ref')}
            placeholderTextColor={Colors.textMuted}
            value={caseRef}
            onChangeText={(v) => { setCaseRef(v.toUpperCase()); setError(null); setResult(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="next"
            accessibilityLabel={t('case_ref_label')}
          />

          <Text style={styles.label}>{t('recovery_secret_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enter_recovery_code')}
            placeholderTextColor={Colors.textMuted}
            value={recoverySecret}
            onChangeText={(v) => { setRecoverySecret(v); setError(null); setResult(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel={t('recovery_secret_label')}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (caseRef.trim().length !== 8 || !recoverySecret.trim() || loading) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={caseRef.trim().length !== 8 || !recoverySecret.trim() || loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Check Status</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>📋 Case Report</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Status</Text>
              <View style={[styles.statusBadge, getStatusStyle(result.status)]}>
                <Text style={styles.statusBadgeText}>{result.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Category</Text>
              <Text style={styles.resultValue}>{result.category}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Submitted</Text>
              <Text style={styles.resultValue}>{formatDate(result.createdAt)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Last Updated</Text>
              <Text style={styles.resultValue}>{formatDate(result.updatedAt)}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStatusStyle(status: string): object {
  const s = status.toLowerCase();
  if (s === 'open' || s === 'new') return { backgroundColor: Colors.blueLight };
  if (s === 'closed' || s === 'resolved') return { backgroundColor: Colors.approvedBg };
  if (s === 'escalated') return { backgroundColor: Colors.deniedBg };
  return { backgroundColor: Colors.pendingBg };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  langToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  submitBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  resultCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
  },
  resultTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultKey: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  resultValue: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textPrimary },
});
