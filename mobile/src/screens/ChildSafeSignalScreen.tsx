/**
 * ChildSafeSignalScreen.tsx
 *
 * Child — report a safety concern via SafeSignal.
 * Supports English / Luganda via useTranslation.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiPost } from '../config/api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';

type Category =
  | 'Suspicious Message'
  | 'Cyberbullying'
  | 'Threats'
  | 'Inappropriate Request'
  | 'Suspicious Link'
  | 'Other';

export default function ChildSafeSignalScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const CATEGORIES: { key: Category; icon: string; label: string }[] = [
    { key: 'Suspicious Message',    icon: '💬', label: t('cat_suspicious_message') },
    { key: 'Cyberbullying',         icon: '😢', label: t('cat_cyberbullying') },
    { key: 'Threats',               icon: '⚠️', label: t('cat_threats') },
    { key: 'Inappropriate Request', icon: '🚫', label: t('cat_inappropriate_request') },
    { key: 'Suspicious Link',       icon: '🔗', label: t('cat_suspicious_link') },
    { key: 'Other',                 icon: '❓', label: t('cat_other') },
  ];

  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!category || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/safesignal', {
        category,
        description: description.trim(),
        submittedText: submittedText.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('btn_submit_report'));
    } finally {
      setSubmitting(false);
    }
  }, [category, description, submittedText, t]);

  if (success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('safe_signal_title')} onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>{t('report_submitted')}</Text>
          <Text style={styles.successText}>{t('report_submitted_text')}</Text>
          <PrimaryButton
            label={t('safesignal_done')}
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
      <ScreenHeader title={t('safe_signal_screen_title')} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>{t('what_is_happening')}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryCard,
                category === key && styles.categoryCardSelected,
              ]}
              onPress={() => setCategory(key)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: category === key }}
            >
              <Text style={styles.categoryIcon}>{icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  category === key && styles.categoryLabelSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('describe_what_happened')}</Text>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder={t('placeholder_describe')}
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={t('describe_what_happened')}
          />
        </Card>

        <Text style={styles.sectionLabel}>{t('paste_message_content')}</Text>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder={t('placeholder_paste')}
            placeholderTextColor={Colors.textMuted}
            value={submittedText}
            onChangeText={setSubmittedText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel={t('paste_message_content')}
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={t('btn_submit_report')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!category || !description.trim()}
          style={styles.submitBtn}
        />

        <Text style={styles.disclaimer}>{t('report_private_disclaimer')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: NAVY,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    elevation: 1,
  },
  categoryCardSelected: {
    borderColor: TEAL,
    backgroundColor: TEAL + '15',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: TEAL,
  },
  inputCard: {
    padding: 0,
    marginBottom: 0,
  },
  textArea: {
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  submitBtn: { marginTop: Spacing.md },
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
