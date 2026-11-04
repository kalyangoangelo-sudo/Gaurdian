/**
 * CommercialLandingScreen.tsx
 *
 * Public commercial landing page — plans, pricing, and demo request form.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

interface Plan {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: 'UGX 0',
    description: 'For individuals and families getting started.',
    features: [
      'Anonymous public reporting',
      'Case status tracking',
      'Basic child safety tips',
    ],
  },
  {
    name: 'Family Premium',
    price: 'UGX 10,000/mo',
    description: 'Advanced protection for families.',
    features: [
      'Everything in Free',
      'Real-time SafeSignal alerts',
      'Content restrictions & filtering',
      'Device heartbeat monitoring',
      'Priority case handling',
    ],
    highlight: true,
  },
  {
    name: 'School Starter',
    price: 'UGX 100,000/mo',
    description: 'Multi-device protection for schools.',
    features: [
      'Everything in Family Premium',
      'Up to 50 student profiles',
      'Dedicated caseworker access',
      'Monthly safety report',
      'School admin dashboard',
    ],
  },
  {
    name: 'NGO / Institutional',
    price: 'Custom',
    description: 'Tailored solutions for NGOs, governments, and large institutions.',
    features: [
      'Unlimited profiles',
      'Custom integrations',
      'Dedicated support team',
      'Training & onboarding',
      'SLA guarantee',
    ],
  },
];

export default function CommercialLandingScreen() {
  const router = useRouter();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDemoRequest = useCallback(async () => {
    if (!contactName.trim() || !contactEmail.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/organizations/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          orgName: orgName.trim(),
          message: message.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${response.status}`);
      }
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [contactName, contactEmail, orgName, message]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.shield}>🛡</Text>
          <Text style={styles.heroTitle}>GuardianLink</Text>
          <Text style={styles.heroSubtitle}>Keeping Children Safe Online</Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>
              Public reporting is always free — no subscription required
            </Text>
          </View>
        </View>

        {/* Plans */}
        <Text style={styles.sectionHeader}>Choose a Plan</Text>
        {PLANS.map((plan) => (
          <View key={plan.name} style={[styles.planCard, plan.highlight && styles.planCardHighlight]}>
            {plan.highlight ? (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            ) : null}
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
            <View style={styles.featureList}>
              {plan.features.map((f) => (
                <Text key={f} style={styles.featureItem}>✓ {f}</Text>
              ))}
            </View>
            {plan.name !== 'Free' ? (
              <TouchableOpacity
                style={[styles.planBtn, plan.highlight && styles.planBtnHighlight]}
                accessibilityRole="button"
                accessibilityLabel={`Request demo for ${plan.name}`}
                onPress={() => {
                  setOrgName('');
                  setMessage(`I am interested in the ${plan.name} plan.`);
                }}
              >
                <Text style={[styles.planBtnText, plan.highlight && styles.planBtnTextHighlight]}>
                  {plan.price === 'Custom' ? 'Contact Us' : 'Request Demo'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        {/* Demo request form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeader}>Request a Demo</Text>
          {submitSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✅ Thank you! We will be in touch within 1–2 business days.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.formLabel}>Your Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Colors.textMuted}
                value={contactName}
                onChangeText={setContactName}
                returnKeyType="next"
                accessibilityLabel="Your name"
              />

              <Text style={styles.formLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                accessibilityLabel="Email address"
              />

              <Text style={styles.formLabel}>Organisation Name</Text>
              <TextInput
                style={styles.input}
                placeholder="School, NGO, or company name"
                placeholderTextColor={Colors.textMuted}
                value={orgName}
                onChangeText={setOrgName}
                returnKeyType="next"
                accessibilityLabel="Organisation name"
              />

              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your needs…"
                placeholderTextColor={Colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Message"
              />

              {submitError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!contactName.trim() || !contactEmail.trim() || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleDemoRequest}
                disabled={!contactName.trim() || !contactEmail.trim() || submitting}
                accessibilityRole="button"
              >
                {submitting
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.submitBtnText}>Send Request</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.sm },
  backBtnText: { fontSize: FontSize.md, color: Colors.blue, fontWeight: '600' },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  shield: { fontSize: 52, marginBottom: Spacing.sm },
  heroTitle: { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
  heroSubtitle: { fontSize: FontSize.lg, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  freeBadge: {
    marginTop: Spacing.md,
    backgroundColor: Colors.approvedBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  freeBadgeText: { fontSize: FontSize.sm, color: Colors.approved, fontWeight: '600', textAlign: 'center' },
  sectionHeader: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  planCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  planCardHighlight: { borderColor: Colors.blue },
  popularBadge: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.sm,
  },
  popularBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
  planName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary },
  planPrice: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.blue, marginVertical: Spacing.xs },
  planDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  featureList: { marginBottom: Spacing.sm },
  featureItem: { fontSize: FontSize.sm, color: Colors.textPrimary, marginBottom: 4, lineHeight: 20 },
  planBtn: {
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: Radius.sm,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  planBtnHighlight: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  planBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  planBtnTextHighlight: { color: Colors.white },
  formSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formLabel: {
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
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: Spacing.sm },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  successBox: {
    backgroundColor: Colors.approvedBg,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  successText: { color: Colors.approved, fontSize: FontSize.md, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
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
});
