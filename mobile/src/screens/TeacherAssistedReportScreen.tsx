/**
 * TeacherAssistedReportScreen.tsx
 *
 * Institutional / teacher-assisted incident report.
 * Requires a valid teacher JWT (stored under 'auth_token' in AsyncStorage).
 *
 * The teacher submits on behalf of a child and receives a caseRef +
 * recoverySecret to pass to that child directly. The report is NOT
 * linked to the teacher's account and the teacher cannot retrieve it
 * after this screen is dismissed.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';
import { ScreenHeader } from '../components/ScreenHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TeacherAssistedReportScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [safeToContact, setSafeToContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    caseRef: string;
    recoverySecret: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!category || !description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Read the JWT that was stored at login — same key used by AuthContext
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('You are not signed in. Please log in as a teacher and try again.');
      }

      const response = await fetch(`${API_BASE_URL}/reports/assisted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          description: description.trim(),
          safeToContact,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        caseRef: string;
        recoverySecret: string;
      };

      // Display once — never written to persistent storage
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
    setTimeout(() => setCopied(false), 2500);
  }, [successData]);

  const handleDone = useCallback(() => {
    // Clear sensitive values from state before navigating away
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
      <ScreenHeader title="Assisted Report" onBack={() => router.back()} />

      {/* ── Disclaimer banner (always visible) ─────────────────────────── */}
      <View style={styles.disclaimerBanner} accessibilityRole="alert">
        <Text style={styles.disclaimerText}>
          {'\u26a0\ufe0f'} Assisted Report — You are submitting on behalf of a child.
          You will NOT automatically receive case access. Share the case reference
          with the child directly.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Category picker ──────────────────────────────────────────── */}
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
              <Text
                style={[styles.pillText, category === cat && styles.pillTextSelected]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Description ──────────────────────────────────────────────── */}
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

        {/* ── Safe to contact switch ────────────────────────────────────── */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <Text style={styles.switchLabel}>Safe to contact the child</Text>
            <Text style={styles.switchHint}>
              Enable only if a caseworker can safely reach the child
            </Text>
          </View>
          <Switch
            value={safeToContact}
            onValueChange={setSafeToContact}
            trackColor={{ false: Colors.border, true: Colors.blue }}
            thumbColor={Colors.white}
            accessibilityLabel="Safe to contact the child"
          />
        </View>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!category || !description.trim() || loading) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!category || !description.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel={t('btn_submit_report')}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{t('btn_submit_report')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Success modal ────────────────────────────────────────────────── */}
      <Modal visible={!!successData} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>✅ {t('report_submitted')}</Text>

            {/* Instruction to hand off to child */}
            <View style={styles.handOffBox}>
              <Text style={styles.handOffText}>
                Give this reference to the child:{' '}
                <Text style={styles.handOffRef}>{successData?.caseRef}</Text>
              </Text>
            </View>

            <Text style={styles.modalLabel}>{t('case_ref_label')}</Text>
            <Text style={styles.caseRef}>{successData?.caseRef}</Text>

            <Text style={styles.modalLabel}>{t('recovery_secret_label')}</Text>
            <Text style={styles.recoverySecret}>{successData?.recoverySecret}</Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Share both privately. These will not be shown again.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Copy case details to clipboard"
            >
              <Text style={styles.copyBtnText}>
                {copied ? '✓ Copied!' : '📋 Copy Details'}
              </Text>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },

  // Disclaimer banner
  disclaimerBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FBBF24',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  disclaimerText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 20,
  },

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

  // Category pills
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

  // Description
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

  // Safe to contact
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

  // Error
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },

  // Submit button
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
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.approved,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  handOffBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  handOffText: {
    fontSize: FontSize.md,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  handOffRef: { fontWeight: '700', letterSpacing: 2 },
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
