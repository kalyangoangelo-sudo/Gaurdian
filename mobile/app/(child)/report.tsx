/**
 * app/(child)/report.tsx
 *
 * Child Report tab — submit a SafeSignal safety concern.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { apiPost } from '../../src/config/api';
import { Card } from '../../src/components/Card';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Colors, FontSize, Spacing, Radius } from '../../src/styles/theme';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';

const CATEGORIES = [
  { key: 'Suspicious Message',    icon: '💬' },
  { key: 'Cyberbullying',         icon: '😢' },
  { key: 'Threats',               icon: '⚠️' },
  { key: 'Inappropriate Request', icon: '🚫' },
  { key: 'Suspicious Link',       icon: '🔗' },
  { key: 'Other',                 icon: '❓' },
] as const;

type Category = (typeof CATEGORIES)[number]['key'];

export default function ChildReportTab() {
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
      setError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  }, [category, description, submittedText]);

  const handleReset = useCallback(() => {
    setSuccess(false);
    setCategory(null);
    setDescription('');
    setSubmittedText('');
    setError(null);
  }, []);

  if (success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="SafeSignal" />
        <View style={styles.centeredContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successText}>
            Your safety concern has been sent to your guardian for review.
            You are not alone — help is on the way.
          </Text>
          <PrimaryButton
            label="Submit Another"
            onPress={handleReset}
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
      <ScreenHeader title="SafeSignal — Report a Concern" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>What is happening?</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryCard,
                category === key && styles.categoryCardSelected,
              ]}
              onPress={() => setCategory(key)}
              accessibilityRole="button"
              accessibilityLabel={`Category: ${key}`}
              accessibilityState={{ selected: category === key }}
            >
              <Text style={styles.categoryIcon}>{icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  category === key && styles.categoryLabelSelected,
                ]}
              >
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Describe what happened *</Text>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the situation in your own words…"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Description"
          />
        </Card>

        <Text style={styles.sectionLabel}>Paste the message or content (optional)</Text>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Paste the suspicious message, link, or text here…"
            placeholderTextColor={Colors.textMuted}
            value={submittedText}
            onChangeText={setSubmittedText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Submitted text"
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Submit Report"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!category || !description.trim()}
          style={styles.submitBtn}
        />

        <Text style={styles.disclaimer}>
          🔒 Your report is private and only shared with your guardian.
        </Text>
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
