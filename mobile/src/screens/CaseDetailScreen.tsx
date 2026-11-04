/**
 * CaseDetailScreen.tsx
 *
 * Full case detail view for caseworkers.
 * Includes AI assessment, priority/status pickers, notes, evidence, referral, and audit trail.
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

type Priority = 'CRITICAL' | 'HIGH' | 'STANDARD';
type CaseStatus = 'new' | 'open' | 'escalated' | 'closed' | 'resolved';

interface AiResult {
  suggestedPriority?: Priority;
  confidence?: number;
  reasoning?: string;
  flags?: string[];
}

interface CaseNote {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor?: string;
  createdAt: string;
}

interface CaseDetail {
  id: string;
  caseRef: string;
  category: string;
  description?: string;
  status: CaseStatus;
  humanPriority?: Priority;
  aiResult?: AiResult;
  submittedByRole?: string;
  safeToContact?: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: CaseNote[];
  auditTrail?: AuditEntry[];
}

const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'STANDARD'];
const STATUSES: CaseStatus[] = ['new', 'open', 'escalated', 'closed', 'resolved'];

export default function CaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Priority update
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityMsg, setPriorityMsg] = useState<string | null>(null);

  // Status update
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Notes
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteMsg, setNoteMsg] = useState<string | null>(null);

  // Referral
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralResult, setReferralResult] = useState<string | null>(null);

  // Audit trail collapsible
  const [auditOpen, setAuditOpen] = useState(false);

  const getToken = async () => {
    const t = await AsyncStorage.getItem('caseworker_token');
    return t ?? '';
  };

  const fetchCase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        router.replace('/caseworker-login' as any);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: CaseDetail = await response.json();
      setCaseData(data);
      setSelectedPriority(data.humanPriority ?? null);
      setSelectedStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handlePriorityUpdate = useCallback(async () => {
    if (!id || !selectedPriority) return;
    setPriorityLoading(true);
    setPriorityMsg(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/cases/${id}/assess`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ humanPriority: selectedPriority }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPriorityMsg('Priority updated.');
      fetchCase();
    } catch (err) {
      setPriorityMsg(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setPriorityLoading(false);
    }
  }, [id, selectedPriority, fetchCase]);

  const handleStatusUpdate = useCallback(async () => {
    if (!id || !selectedStatus) return;
    setStatusLoading(true);
    setStatusMsg(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/cases/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatusMsg('Status updated.');
      fetchCase();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setStatusLoading(false);
    }
  }, [id, selectedStatus, fetchCase]);

  const handleAddNote = useCallback(async () => {
    if (!id || !noteText.trim()) return;
    setNoteLoading(true);
    setNoteMsg(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/cases/${id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNoteMsg('Note added.');
      setNoteText('');
      fetchCase();
    } catch (err) {
      setNoteMsg(err instanceof Error ? err.message : 'Failed to add note.');
    } finally {
      setNoteLoading(false);
    }
  }, [id, noteText, fetchCase]);

  const handleReferral = useCallback(async () => {
    if (!id) return;
    setReferralLoading(true);
    setReferralResult(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/cases/${id}/refer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setReferralResult(`⚠️ SIMULATED — ${data.message ?? 'Referral submitted to agency.'}`);
    } catch (err) {
      setReferralResult(`⚠️ SIMULATED — ${err instanceof Error ? err.message : 'Referral failed.'}`);
    } finally {
      setReferralLoading(false);
    }
  }, [id]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  if (error || !caseData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Case not found.'}</Text>
        <TouchableOpacity style={styles.backBtnInline} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.backBtnText}>← Back to Cases</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.caseHeader}>
        <Text style={styles.caseRef}>{caseData.caseRef}</Text>
        <Text style={styles.caseCategory}>{caseData.category}</Text>
        <Text style={styles.caseMeta}>Status: {caseData.status} · {caseData.submittedByRole ?? 'Anonymous'}</Text>
        <Text style={styles.caseDate}>Created: {formatDate(caseData.createdAt)}</Text>
        <Text style={styles.caseDate}>Updated: {formatDate(caseData.updatedAt)}</Text>
        {caseData.safeToContact !== undefined ? (
          <Text style={styles.caseDate}>Safe to contact: {caseData.safeToContact ? 'Yes' : 'No'}</Text>
        ) : null}
      </View>

      {/* Description */}
      {caseData.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{caseData.description}</Text>
        </View>
      ) : null}

      {/* AI Assessment */}
      {caseData.aiResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Assessment (automated)</Text>
          {caseData.aiResult.suggestedPriority ? (
            <Text style={styles.aiField}>Suggested Priority: <Text style={styles.aiBold}>{caseData.aiResult.suggestedPriority}</Text></Text>
          ) : null}
          {caseData.aiResult.confidence !== undefined ? (
            <Text style={styles.aiField}>Confidence: {Math.round(caseData.aiResult.confidence * 100)}%</Text>
          ) : null}
          {caseData.aiResult.reasoning ? (
            <Text style={styles.aiField}>Reasoning: {caseData.aiResult.reasoning}</Text>
          ) : null}
          {caseData.aiResult.flags && caseData.aiResult.flags.length > 0 ? (
            <Text style={styles.aiField}>Flags: {caseData.aiResult.flags.join(', ')}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Priority Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Priority</Text>
        <View style={styles.pickerRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pickerChip, selectedPriority === p && styles.pickerChipActive]}
              onPress={() => setSelectedPriority(p)}
              accessibilityRole="button"
            >
              <Text style={[styles.pickerChipText, selectedPriority === p && styles.pickerChipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, (!selectedPriority || priorityLoading) && styles.saveBtnDisabled]}
          onPress={handlePriorityUpdate}
          disabled={!selectedPriority || priorityLoading}
        >
          {priorityLoading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Save Priority</Text>
          }
        </TouchableOpacity>
        {priorityMsg ? <Text style={styles.successMsg}>{priorityMsg}</Text> : null}
      </View>

      {/* Status Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Status</Text>
        <View style={styles.pickerRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pickerChip, selectedStatus === s && styles.pickerChipActive]}
              onPress={() => setSelectedStatus(s)}
              accessibilityRole="button"
            >
              <Text style={[styles.pickerChipText, selectedStatus === s && styles.pickerChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, (!selectedStatus || statusLoading) && styles.saveBtnDisabled]}
          onPress={handleStatusUpdate}
          disabled={!selectedStatus || statusLoading}
        >
          {statusLoading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Save Status</Text>
          }
        </TouchableOpacity>
        {statusMsg ? <Text style={styles.successMsg}>{statusMsg}</Text> : null}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        {(caseData.notes ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No notes yet.</Text>
        ) : (
          (caseData.notes ?? []).map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteText}>{note.text}</Text>
              <Text style={styles.noteMeta}>
                {note.author ? `${note.author} · ` : ''}{formatDate(note.createdAt)}
              </Text>
            </View>
          ))
        )}
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note…"
          placeholderTextColor={Colors.textMuted}
          value={noteText}
          onChangeText={setNoteText}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Add note"
        />
        <TouchableOpacity
          style={[styles.saveBtn, (!noteText.trim() || noteLoading) && styles.saveBtnDisabled]}
          onPress={handleAddNote}
          disabled={!noteText.trim() || noteLoading}
        >
          {noteLoading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Add Note</Text>
          }
        </TouchableOpacity>
        {noteMsg ? <Text style={styles.successMsg}>{noteMsg}</Text> : null}
      </View>

      {/* Evidence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidence</Text>
        <TouchableOpacity
          style={styles.evidenceBtn}
          onPress={() => router.push({ pathname: '/evidence' as any, params: { caseId: caseData.id } })}
          accessibilityRole="button"
        >
          <Text style={styles.evidenceBtnText}>📎 View / Upload Evidence</Text>
        </TouchableOpacity>
      </View>

      {/* Referral */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agency Referral</Text>
        <TouchableOpacity
          style={[styles.referralBtn, referralLoading && styles.saveBtnDisabled]}
          onPress={handleReferral}
          disabled={referralLoading}
          accessibilityRole="button"
        >
          {referralLoading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Refer to Agency (SIMULATED)</Text>
          }
        </TouchableOpacity>
        {referralResult ? (
          <View style={styles.simulatedBox}>
            <Text style={styles.simulatedText}>{referralResult}</Text>
          </View>
        ) : null}
      </View>

      {/* Audit trail */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.auditToggle}
          onPress={() => setAuditOpen((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={styles.sectionTitle}>{auditOpen ? '▼' : '▶'} Audit Trail</Text>
        </TouchableOpacity>
        {auditOpen ? (
          (caseData.auditTrail ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No audit entries.</Text>
          ) : (
            (caseData.auditTrail ?? []).map((entry) => (
              <View key={entry.id} style={styles.auditRow}>
                <Text style={styles.auditAction}>{entry.action}</Text>
                <Text style={styles.auditMeta}>
                  {entry.actor ? `${entry.actor} · ` : ''}{formatDate(entry.createdAt)}
                </Text>
              </View>
            ))
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  errorText: { color: Colors.denied, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm },
  backBtnInline: { marginTop: Spacing.sm },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.sm },
  backBtnText: { fontSize: FontSize.md, color: Colors.blue, fontWeight: '600' },
  caseHeader: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  caseRef: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.primary, letterSpacing: 2 },
  caseCategory: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  caseMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  caseDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  section: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  descriptionText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  aiField: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, lineHeight: 20 },
  aiBold: { fontWeight: '700', color: Colors.textPrimary },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  pickerChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundPage,
  },
  pickerChipActive: { borderColor: Colors.blue, backgroundColor: Colors.blueLight },
  pickerChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  pickerChipTextActive: { color: Colors.blue },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  successMsg: { fontSize: FontSize.sm, color: Colors.approved, fontWeight: '600', marginTop: Spacing.xs, textAlign: 'center' },
  noteCard: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  noteMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  evidenceBtn: {
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: Radius.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evidenceBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
  referralBtn: {
    backgroundColor: Colors.pending,
    borderRadius: Radius.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatedBox: {
    backgroundColor: Colors.pendingBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  simulatedText: { fontSize: FontSize.sm, color: Colors.pending, fontWeight: '600', textAlign: 'center' },
  auditToggle: { marginBottom: Spacing.sm },
  auditRow: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  auditAction: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  auditMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
});
