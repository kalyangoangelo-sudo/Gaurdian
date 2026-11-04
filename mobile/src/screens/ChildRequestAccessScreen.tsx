/**
 * ChildRequestAccessScreen.tsx
 *
 * Child — request access to a blocked website.
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

const TEAL = '#00B4D8';

export default function ChildRequestAccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedUrl = url.trim();
    const trimmedReason = reason.trim();
    if (!trimmedUrl || !trimmedReason) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/requests', { url: trimmedUrl, reason: trimmedReason });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed_submit_request'));
    } finally {
      setSubmitting(false);
    }
  }, [url, reason, t]);

  if (success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('request_access_short_title')} onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.successIcon}>📤</Text>
          <Text style={styles.successTitle}>{t('request_sent_title')}</Text>
          <Text style={styles.successText}>{t('request_sent_text')}</Text>
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
      <ScreenHeader title={t('request_access_title')} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{t('request_access_intro')}</Text>

        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>{t('field_website_url')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('placeholder_url')}
            placeholderTextColor={Colors.textMuted}
            value={url}
            onChangeText={(v) => { setUrl(v); setError(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t('field_website_url')}
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>{t('field_reason')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('placeholder_why_visit')}
            placeholderTextColor={Colors.textMuted}
            value={reason}
            onChangeText={(v) => { setReason(v); setError(null); }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel={t('field_reason')}
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={t('btn_submit_request')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!url.trim() || !reason.trim()}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  intro: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  formCard: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
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
    minHeight: 72,
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
    color: TEAL,
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
