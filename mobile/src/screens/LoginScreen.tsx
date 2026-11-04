/**
 * LoginScreen.tsx
 *
 * Firebase Auth login — uses email + password.
 * Supports English / Luganda via useTranslation.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../styles/theme';
import { useTranslation } from '../localization/useTranslation';

export default function LoginScreen() {
  const { login, isLoading, loginError } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password) return;
    login(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Language toggle */}
        <TouchableOpacity
          style={styles.langToggle}
          onPress={() => setLang(lang === 'en' ? 'lg' : 'en')}
          accessibilityRole="button"
          accessibilityLabel={t('language_toggle')}
        >
          <Text style={styles.langToggleText}>{t('language_toggle')}</Text>
        </TouchableOpacity>

        {/* Branding */}
        <View style={styles.brandContainer}>
          <Text style={styles.shield}>🛡</Text>
          <Text style={styles.brandName}>{t('brand_name')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('sign_in')}</Text>

          {/* Email */}
          <Text style={styles.label}>{t('label_email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('placeholder_email')}
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            accessibilityLabel={t('label_email')}
          />

          {/* Password */}
          <Text style={styles.label}>{t('label_password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('placeholder_password')}
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel={t('label_password')}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeBtn}
              accessibilityLabel={showPassword ? t('hide_password') : t('show_password')}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {loginError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, (isLoading || !email.trim() || !password) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || !email.trim() || !password}
            accessibilityRole="button"
          >
            {isLoading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.buttonText}>{t('sign_in')}</Text>
            }
          </TouchableOpacity>

          {/* Demo accounts hint */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>{t('demo_accounts')}</Text>
            <Text style={styles.demoText}>{t('demo_parent')}</Text>
            <Text style={styles.demoText}>{t('demo_child')}</Text>
          </View>

          {/* Public report link */}
          <TouchableOpacity
            style={styles.reportLink}
            onPress={() => router.push('/public-report' as any)}
            accessibilityRole="link"
            accessibilityLabel="Report an Incident — No login required"
          >
            <Text style={styles.reportLinkText}>🚨 Report an Incident (No login required)</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  langToggle: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  langToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  brandContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  shield: { fontSize: 52, marginBottom: Spacing.sm },
  brandName: { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  tagline: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.xs, marginTop: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 48, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm + 4,
    fontSize: FontSize.md, color: Colors.textPrimary, backgroundColor: Colors.backgroundPage,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    height: 48, width: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderLeftWidth: 0, borderColor: Colors.border,
    borderTopRightRadius: Radius.sm, borderBottomRightRadius: Radius.sm,
    backgroundColor: Colors.backgroundPage,
  },
  eyeIcon: { fontSize: 18 },
  errorBox: { backgroundColor: Colors.deniedBg, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  button: {
    backgroundColor: Colors.blue, borderRadius: Radius.md,
    height: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  demoBox: {
    marginTop: Spacing.lg, padding: Spacing.sm,
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  demoTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.xs },
  demoText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  reportLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportLinkText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.denied },
});
