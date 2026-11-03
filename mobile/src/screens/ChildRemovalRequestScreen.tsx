/**
 * ChildRemovalRequestScreen.tsx
 *
 * Child — request removal of GuardianLink from their device.
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

const NAVY = '#1B2A4A';

export default function ChildRemovalRequestScreen() {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }, [reason]);

  if (success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Removal Request" onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.successIcon}>📝</Text>
          <Text style={styles.successTitle}>Request Submitted</Text>
          <Text style={styles.successText}>
            Your removal request has been sent to your guardian for review.
            They will contact you about the next steps.
          </Text>
          <PrimaryButton
            label="Done"
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
      <ScreenHeader title="Request GuardianLink Removal" onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Informational section */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 About Removal Requests</Text>
          <Text style={styles.infoText}>
            GuardianLink is installed on this device to help keep you safe online.
            If you believe the protection is no longer needed, you can request its removal.
          </Text>
          <Text style={styles.infoText}>
            Your guardian will review your request and decide whether to approve it.
            GuardianLink will <Text style={styles.bold}>not</Text> be removed automatically —
            a guardian must authorize removal.
          </Text>
          <Text style={styles.infoText}>
            This request is transparent and will be shown to your guardian.
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>Reason for removal *</Text>
          <Text style={styles.fieldHint}>
            Explain why you feel GuardianLink protection is no longer needed.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. I am now 16 and my parent and I have agreed I no longer need monitoring."
            placeholderTextColor={Colors.textMuted}
            value={reason}
            onChangeText={(v) => { setReason(v); setError(null); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Reason for removal"
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Submit Removal Request"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!reason.trim()}
          style={styles.submitBtn}
        />

        <Text style={styles.disclaimer}>
          This request will be logged and reviewed by your guardian.
        </Text>
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
  bold: { fontWeight: '700', color: Colors.textPrimary },
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
