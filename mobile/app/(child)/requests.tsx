/**
 * app/(child)/requests.tsx
 *
 * Child Requests tab — submit access requests and view existing ones.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { usersRef } from '../../src/services/firebase';
import {
  createRequest,
  subscribeChildRequests,
} from '../../src/services/firebaseRequests';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { RequestCard } from '../../src/components/RequestCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Radius, FontSize } from '../../src/styles/theme';
import type { AccessRequest } from '../../src/types';

export default function ChildRequestsTab() {
  const { user } = useAuth();

  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    usersRef().doc(user.id).get().then(snap => {
      setParentId(snap.data()?.parentId ?? null);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeChildRequests(
      user.id,
      (data) => { setRequests(data); setListError(null); },
      (err) => setListError(err.message)
    );
    return unsub;
  }, [user?.id]);

  const handleSubmit = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || !user || !parentId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await createRequest(user.id, parentId, trimmed);
      setUrlInput('');
      setSubmitSuccess('Request sent! Your parent will be notified.');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  }, [urlInput, user, parentId]);

  const renderItem = ({ item }: { item: AccessRequest }) => (
    <RequestCard request={item} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Access Requests" />

      <View style={styles.container}>
        {/* Request form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Request Website Access</Text>
          <Text style={styles.formHint}>Ask your parent for permission to visit a website.</Text>

          <TextInput
            style={styles.urlInput}
            placeholder="https://example.com"
            placeholderTextColor={Colors.textMuted}
            value={urlInput}
            onChangeText={(v) => { setUrlInput(v); setSubmitError(null); setSubmitSuccess(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Website URL"
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
            label="Request Access"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!urlInput.trim() || !parentId}
            style={styles.submitBtn}
          />

          {!parentId && (
            <Text style={styles.warnText}>⚠ No parent account linked to your account yet.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Your Requests</Text>

        {listError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No requests yet</Text>
                <Text style={styles.emptyText}>
                  Enter a website URL above and tap "Request Access".
                </Text>
              </View>
            }
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
