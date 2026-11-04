/**
 * ChildRemovalRequestScreen.tsx
 *
 * Child — request removal of GuardianLink from their device.
 * Supports English / Luganda via useTranslation.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiPost } from '../config/api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';

const NAVY = '#1B2A4A';

export default function ChildRemovalRequestScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/removal-request', { reason: trimmedReason });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed_submit_removal'));
    } finally {
      setSubmitting(false);
    }
  }, [reason, t]);

  if (success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('removal_request_short_title')} onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.successIcon}>📝</Text>
          <Text style={styles.successTitle}>{t('removal_submitted_title')}</Text>
          <Text style={styles.successText}>{t('removal_submitted_text')}</Text>
          <PrimaryButton
            label={t('btn_done')}
            onPress={() => router.back()}
            style={styles.doneBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={t('removal_request_title')} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Informational section */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('about_removal_title')}</Text>
          <Text style={styles.infoText}>{t('about_removal_text1')}</Text>
          <Text style={styles.infoText}>{t('about_removal_text2')}</Text>
          <Text style={styles.infoText}>{t('about_removal_text3')}</Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>{t('field_reason_removal')}</Text>
          <Text style={styles.fieldHint}>{t('field_reason_removal_hint')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('placeholder_removal_reason')}
            placeholderTextColor={Colors.textMuted}
            value={reason}
            onChangeText={(v) => { setReason(v); setError(null); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={t('field_reason_removal')}
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={t('btn_submit_removal')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!reason.trim()}
          style={styles.submitBtn}
        />

        <Text style={styles.disclaimer}>{t('removal_disclaimer')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formCard: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  submitBtn: { marginTop: Spacing.xs },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  successIcon: { fontSize: 56, marginBottom: Spacing.md },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.approved,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  doneBtn: { width: '80%' },
});
