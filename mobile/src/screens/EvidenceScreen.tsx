/**
 * EvidenceScreen.tsx
 *
 * Upload and verify evidence files for a case.
 * Uses a text-based submission to send synthetic demo evidence (no native file picker needed).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

interface EvidenceItem {
  id: string;
  filename: string;
  mimeType?: string;
  sha256?: string;
  createdAt: string;
}

export default function EvidenceScreen() {
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();

  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedSha256, setUploadedSha256] = useState<string | null>(null);

  // Verify
  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'VERIFIED' | 'TAMPERED' | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const getToken = async () => {
    return (await AsyncStorage.getItem('caseworker_token')) ?? '';
  };

  const fetchEvidence = useCallback(async () => {
    if (!caseId) return;
    setLoadingList(true);
    setListError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/evidence/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setEvidence(Array.isArray(data) ? data : data.evidence ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load evidence.');
    } finally {
      setLoadingList(false);
    }
  }, [caseId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const [demoFilename, setDemoFilename] = useState('demo-screenshot.png');

  const handleUpload = useCallback(async () => {
    if (!caseId) return;
    setUploadMsg(null);
    setUploadError(null);
    setUploadedSha256(null);
    setUploading(true);

    try {
      // Submit synthetic demo evidence as JSON (no native file picker needed)
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/evidence/${caseId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: demoFilename || 'demo-evidence.txt',
          mimeType: 'text/plain',
          // Synthetic demo content — not real evidence
          content: `GuardianLink demo evidence file: ${demoFilename}. Submitted at ${new Date().toISOString()}. This is synthetic test data for hackathon demonstration purposes only.`,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setUploadMsg(`Uploaded: ${demoFilename}`);
      if (data.sha256) setUploadedSha256(data.sha256);
      fetchEvidence();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, [caseId, demoFilename, fetchEvidence]);

  const handleVerify = useCallback(async () => {
    const evidenceId = verifyId.trim();
    if (!evidenceId) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/evidence/verify/${evidenceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setVerifyResult(data.verified === true ? 'VERIFIED' : 'TAMPERED');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }, [verifyId]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>📎 Evidence</Text>
      {caseId ? <Text style={styles.caseIdText}>Case: {caseId}</Text> : null}

      {/* Upload section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Evidence</Text>
        <Text style={styles.demoNote}>⚠️ Demo mode — enter a synthetic filename for hackathon demonstration</Text>
        <TextInput
          style={[styles.input, { marginBottom: Spacing.sm }]}
          placeholder="e.g. screenshot.png, chat-log.txt"
          placeholderTextColor={Colors.textMuted}
          value={demoFilename}
          onChangeText={setDemoFilename}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Demo filename"
        />
        <TouchableOpacity
          style={[styles.uploadBtn, (uploading || !demoFilename.trim()) && styles.btnDisabled]}
          onPress={handleUpload}
          disabled={uploading || !demoFilename.trim()}
          accessibilityRole="button"
        >
          {uploading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.uploadBtnText}>📤 Submit Demo Evidence</Text>
          }
        </TouchableOpacity>

        {uploadMsg ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {uploadMsg}</Text>
            {uploadedSha256 ? (
              <Text style={styles.sha256Text}>SHA-256: {uploadedSha256}</Text>
            ) : null}
          </View>
        ) : null}

        {uploadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{uploadError}</Text>
          </View>
        ) : null}
      </View>

      {/* Verify section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verify Evidence</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter evidence ID to verify"
          placeholderTextColor={Colors.textMuted}
          value={verifyId}
          onChangeText={(v) => { setVerifyId(v); setVerifyResult(null); setVerifyError(null); }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          accessibilityLabel="Evidence ID"
        />
        <TouchableOpacity
          style={[styles.verifyBtn, (!verifyId.trim() || verifying) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={!verifyId.trim() || verifying}
          accessibilityRole="button"
        >
          {verifying
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Verify</Text>
          }
        </TouchableOpacity>

        {verifyResult ? (
          <View style={[
            styles.verifyResult,
            verifyResult === 'VERIFIED' ? styles.verifyVerified : styles.verifyTampered,
          ]}>
            <Text style={[
              styles.verifyResultText,
              verifyResult === 'VERIFIED' ? styles.verifyVerifiedText : styles.verifyTamperedText,
            ]}>
              {verifyResult === 'VERIFIED' ? '✓ VERIFIED' : '✗ TAMPERED'}
            </Text>
          </View>
        ) : null}

        {verifyError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{verifyError}</Text>
          </View>
        ) : null}
      </View>

      {/* Evidence list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Existing Evidence</Text>
        {loadingList ? (
          <ActivityIndicator size="small" color={Colors.blue} />
        ) : listError ? (
          <Text style={styles.errorText}>{listError}</Text>
        ) : evidence.length === 0 ? (
          <Text style={styles.emptyText}>No evidence uploaded yet.</Text>
        ) : (
          evidence.map((item) => (
            <View key={item.id} style={styles.evidenceItem}>
              <Text style={styles.evidenceFilename}>{item.filename}</Text>
              {item.sha256 ? (
                <Text style={styles.sha256Text} numberOfLines={1} ellipsizeMode="middle">
                  SHA-256: {item.sha256}
                </Text>
              ) : null}
              <Text style={styles.evidenceMeta}>
                ID: {item.id} · {formatDate(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.sm },
  backBtnText: { fontSize: FontSize.md, color: Colors.blue, fontWeight: '600' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  caseIdText: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  section: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  successBox: {
    backgroundColor: Colors.approvedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  successText: { color: Colors.approved, fontSize: FontSize.sm, fontWeight: '600' },
  sha256Text: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    color: Colors.textMuted,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
    marginBottom: Spacing.sm,
  },
  verifyBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  verifyResult: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  verifyVerified: { backgroundColor: Colors.approvedBg },
  verifyTampered: { backgroundColor: Colors.deniedBg },
  verifyResultText: { fontSize: FontSize.lg, fontWeight: '700' },
  verifyVerifiedText: { color: Colors.approved },
  verifyTamperedText: { color: Colors.denied },
  evidenceItem: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evidenceFilename: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  evidenceMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  demoNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, fontStyle: 'italic' },
});
