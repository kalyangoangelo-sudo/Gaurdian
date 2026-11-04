/**
 * ChildDashboard.tsx
 *
 * Child view — Firestore-backed.
 * Real-time updates via onSnapshot (no Socket.IO needed).
 * Supports English / Luganda via useTranslation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { usersRef } from '../services/firebase';
import {
  createRequest,
  subscribeChildRequests,
} from '../services/firebaseRequests';
import {
  getOrCreateDeviceId,
  startHeartbeat,
  stopHeartbeat,
} from '../services/heartbeatService';
import { AppHeader } from '../components/AppHeader';
import { RequestCard } from '../components/RequestCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Colors, Spacing, Radius, FontSize } from '../styles/theme';
import type { AccessRequest } from '../types';
import { useTranslation } from '../localization/useTranslation';

export default function ChildDashboard() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useTranslation();

  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  // Fetch the child's linked parentId from Firestore
  useEffect(() => {
    if (!user) return;
    usersRef().doc(user.id).get().then(snap => {
      setParentId(snap.data()?.parentId ?? null);
    });
  }, [user?.id]);

  // Subscribe to real-time requests from Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeChildRequests(
      user.id,
      (data) => { setRequests(data); setListError(null); },
      (err) => setListError(err.message)
    );
    return unsub;
  }, [user?.id]);

  // Start heartbeat while child dashboard is mounted
  useEffect(() => {
    let active = true;
    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const token = await AsyncStorage.getItem('auth_token');
      if (active && token) {
        startHeartbeat(deviceId, '1.0', token);
      }
    })();
    return () => {
      active = false;
      stopHeartbeat();
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || !user || !parentId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await createRequest(user.id, parentId, trimmed);
      setUrlInput('');
      setSubmitSuccess(t('request_sent_success'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('failed_submit_request'));
    } finally {
      setSubmitting(false);
    }
  }, [urlInput, user, parentId, t]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>{t('no_requests_yet')}</Text>
      <Text style={styles.emptyText}>{t('no_requests_text')}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: AccessRequest }) => (
    <RequestCard request={item} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        subtitle={`Welcome, ${user?.username ?? 'child'} 👋`}
        connectionStatus="connected"
        onLogout={logout}
      />

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

      <View style={styles.container}>
        {/* Request form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t('request_website_access')}</Text>
          <Text style={styles.formHint}>{t('request_access_hint')}</Text>

          <TextInput
            style={styles.urlInput}
            placeholder={t('placeholder_url')}
            placeholderTextColor={Colors.textMuted}
            value={urlInput}
            onChangeText={(v) => { setUrlInput(v); setSubmitError(null); setSubmitSuccess(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            accessibilityLabel={t('placeholder_url')}
          />

          {submitError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          {submitSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{submitSuccess}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={t('btn_request_access')}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!urlInput.trim() || !parentId}
            style={styles.submitBtn}
          />

          {!parentId && (
            <Text style={styles.warnText}>{t('no_parent_linked')}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('your_requests')}</Text>

        {listError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={requests.length === 0 ? styles.listEmpty : undefined}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  langToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  container: { flex: 1, padding: Spacing.md },
  formCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  formHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  urlInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
  },
  errorBox: { backgroundColor: Colors.deniedBg, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  successBox: { backgroundColor: Colors.approvedBg, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  successText: { color: Colors.approved, fontSize: FontSize.sm, fontWeight: '500' },
  warnText: { color: Colors.pending, fontSize: FontSize.xs, marginTop: Spacing.sm, textAlign: 'center' },
  submitBtn: { marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  listEmpty: { flexGrow: 1 },
});
