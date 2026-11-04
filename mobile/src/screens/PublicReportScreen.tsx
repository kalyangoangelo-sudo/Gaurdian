/**
 * PublicReportScreen.tsx
 *
 * Anonymous public incident report — no auth required.
 * Supports English / Luganda via useTranslation.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Switch,
  Modal, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';
import { ScreenHeader } from '../components/ScreenHeader';

type Category =
  | 'Cyberbullying'
  | 'Online Harassment'
  | 'Grooming'
  | 'Threats'
  | 'Sextortion'
  | 'Impersonation'
  | 'Privacy Violation'
  | 'Exploitation'
  | 'Harmful Content'
  | 'Other';

const CATEGORIES: Category[] = [
  'Cyberbullying',
  'Online Harassment',
  'Grooming',
  'Threats',
  'Sextortion',
  'Impersonation',
  'Privacy Violation',
  'Exploitation',
  'Harmful Content',
  'Other',
];

export default function PublicReportScreen() {
  const router = useRouter();
  const { t, lang, setLang } = useTranslation();

  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [safeToContact, setSafeToContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ caseRef: string; recoverySecret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!category || !description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description: description.trim(), safeToContact }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${response.status}`);
      }
      const data = await response.json();
      setSuccessData({ caseRef: data.caseRef, recoverySecret: data.recoverySecret });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  }, [category, description, safeToContact]);

  const handleCopy = useCallback(async () => {
    if (!successData) return;
    const text = `Case Ref: ${successData.caseRef}\nRecovery Code: ${successData.recoverySecret}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [successData]);

  const handleDone = useCallback(() => {
    setSuccessData(null);
    setCategory(null);
    setDescription('');
    setSafeToContact(false);
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={t('report_anonymous')} onBack={() => router.back()} />

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
        {/* Category picker */}
        <Text style={styles.sectionLabel}>{t('what_is_happening')}</Text>
        <View style={styles.pillRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillSelected]}
              onPress={() => setCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat}
              accessibilityState={{ selected: category === cat }}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>{t('describe_what_happened')}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t('placeholder_describe')}
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          accessibilityLabel={t('describe_what_happened')}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        {/* Safe to contact switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <Text style={styles.switchLabel}>Safe to contact me</Text>
            <Text style={styles.switchHint}>
              Check this only if it is safe for a caseworker to reach you
            </Text>
          </View>
          <Switch
            value={safeToContact}
            onValueChange={setSafeToContact}
            trackColor={{ false: Colors.border, true: Colors.blue }}
            thumbColor={Colors.white}
            accessibilityLabel="Safe to contact"
          />
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!category || !description.trim() || loading) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!category || !description.trim() || loading}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.submitBtnText}>{t('btn_submit_report')}</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t('report_private_disclaimer')}</Text>
      </ScrollView>

      {/* Success modal */}
      <Modal visible={!!successData} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>✅ {t('report_submitted')}</Text>
            <Text style={styles.modalBodyText}>
              Keep these details safe. You will need them to check the status of your report.
            </Text>

            <Text style={styles.modalLabel}>{t('case_ref_label')}</Text>
            <Text style={styles.caseRef}>{successData?.caseRef}</Text>

            <Text style={styles.modalLabel}>{t('recovery_secret_label')}</Text>
            <Text style={styles.recoverySecret}>{successData?.recoverySecret}</Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ {t('save_these_warning')}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Copy case details"
            >
              <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy Details'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDone}
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>{t('btn_done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
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
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    marginBottom: Spacing.xs,
  },
  pillSelected: { borderColor: Colors.blue, backgroundColor: Colors.blueLight },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  pillTextSelected: { color: Colors.blue },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundCard,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabelWrap: { flex: 1, marginRight: Spacing.sm },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  switchHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
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
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.approved,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalBodyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  caseRef: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  recoverySecret: {
    fontSize: FontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  warningBox: {
    backgroundColor: Colors.pendingBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  warningText: {
    fontSize: FontSize.sm,
    color: Colors.pending,
    fontWeight: '600',
    textAlign: 'center',
  },
  copyBtn: {
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
  doneBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
});
