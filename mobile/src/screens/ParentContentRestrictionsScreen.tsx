/**
 * ParentContentRestrictionsScreen.tsx
 *
 * Parent — manage content policy for a child.
 * Loads from GET /policy/:childId, saves via PUT /policy/:childId.
 * Shows 5 category toggles, blocked keywords chips, and trusted domains chips.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Switch, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPut } from '../config/api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, FontSize, Spacing, Radius } from '../styles/theme';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';
const PLACEHOLDER_CHILD_ID = 'demo-child';

const CONTENT_CATEGORIES = [
  { key: 'adult',    label: 'Adult Content',       description: 'Explicit or pornographic material' },
  { key: 'violence', label: 'Violent Content',      description: 'Graphic violence, gore, self-harm' },
  { key: 'gambling', label: 'Gambling Sites',       description: 'Online casinos, sports betting' },
  { key: 'drugs',    label: 'Drug-Related Content', description: 'Drug purchase or manufacture instructions' },
  { key: 'hate',     label: 'Hate Speech',          description: 'Hateful or discriminatory content' },
] as const;

type CategoryKey = (typeof CONTENT_CATEGORIES)[number]['key'];
type ContentCategories = Record<CategoryKey, boolean>;

const DEFAULT_CATEGORIES: ContentCategories = {
  adult: true,
  violence: true,
  gambling: true,
  drugs: true,
  hate: true,
};

export default function ParentContentRestrictionsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<ContentCategories>({ ...DEFAULT_CATEGORIES });
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const policy = await apiGet(`/policy/${PLACEHOLDER_CHILD_ID}`);
      if (policy) {
        if (policy.contentCategories) {
          setCategories({ ...DEFAULT_CATEGORIES, ...policy.contentCategories });
        }
        if (Array.isArray(policy.blockedKeywords)) {
          setBlockedKeywords(policy.blockedKeywords);
        }
        if (Array.isArray(policy.trustedDomains)) {
          setTrustedDomains(policy.trustedDomains);
        }
      }
    } catch {
      // No policy yet — use defaults; not a hard error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await apiPut(`/policy/${PLACEHOLDER_CHILD_ID}`, {
        contentCategories: categories,
        blockedKeywords,
        trustedDomains,
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policy.');
    } finally {
      setSaving(false);
    }
  }, [categories, blockedKeywords, trustedDomains]);

  const toggleCategory = useCallback((key: CategoryKey) => {
    setCategories(prev => ({ ...prev, [key]: !prev[key] }));
    setSaveSuccess(false);
  }, []);

  const addKeyword = useCallback(() => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || blockedKeywords.includes(kw)) return;
    setBlockedKeywords(prev => [...prev, kw]);
    setNewKeyword('');
    setSaveSuccess(false);
  }, [newKeyword, blockedKeywords]);

  const removeKeyword = useCallback((kw: string) => {
    setBlockedKeywords(prev => prev.filter(k => k !== kw));
    setSaveSuccess(false);
  }, []);

  const addDomain = useCallback(() => {
    const d = newDomain.trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '');
    if (!d || trustedDomains.includes(d)) return;
    setTrustedDomains(prev => [...prev, d]);
    setNewDomain('');
    setSaveSuccess(false);
  }, [newDomain, trustedDomains]);

  const removeDomain = useCallback((d: string) => {
    setTrustedDomains(prev => prev.filter(x => x !== d));
    setSaveSuccess(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Content Restrictions" onBack={() => router.back()} />
        <LoadingState message="Loading policy…" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Content Restrictions" onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Category toggles */}
        <Text style={styles.sectionLabel}>Blocked Content Categories</Text>
        <Card style={styles.card}>
          {CONTENT_CATEGORIES.map(({ key, label, description }, index) => (
            <View
              key={key}
              style={[
                styles.toggleRow,
                index < CONTENT_CATEGORIES.length - 1 && styles.toggleBorder,
              ]}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleDesc}>{description}</Text>
              </View>
              <Switch
                value={categories[key]}
                onValueChange={() => toggleCategory(key)}
                trackColor={{ false: Colors.border, true: TEAL + '66' }}
                thumbColor={categories[key] ? TEAL : Colors.textMuted}
                accessibilityLabel={`Toggle ${label}`}
                accessibilityRole="switch"
              />
            </View>
          ))}
        </Card>

        {/* Blocked keywords */}
        <Text style={styles.sectionLabel}>Blocked Keywords</Text>
        <Card style={styles.card}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add keyword…"
              placeholderTextColor={Colors.textMuted}
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={addKeyword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="New blocked keyword"
            />
            <TouchableOpacity
              onPress={addKeyword}
              style={styles.addBtn}
              disabled={!newKeyword.trim()}
              accessibilityRole="button"
              accessibilityLabel="Add keyword"
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsRow}>
            {blockedKeywords.length === 0 ? (
              <Text style={styles.noItemsText}>No blocked keywords set.</Text>
            ) : (
              blockedKeywords.map(kw => (
                <TouchableOpacity
                  key={kw}
                  onPress={() => removeKeyword(kw)}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove keyword: ${kw}`}
                >
                  <Text style={styles.chipText}>{kw} ✕</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Card>

        {/* Trusted domains */}
        <Text style={styles.sectionLabel}>Trusted Websites</Text>
        <Card style={styles.card}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="khanacademy.org"
              placeholderTextColor={Colors.textMuted}
              value={newDomain}
              onChangeText={setNewDomain}
              onSubmitEditing={addDomain}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              accessibilityLabel="New trusted domain"
            />
            <TouchableOpacity
              onPress={addDomain}
              style={[styles.addBtn, styles.addBtnTrusted]}
              disabled={!newDomain.trim()}
              accessibilityRole="button"
              accessibilityLabel="Add trusted domain"
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsRow}>
            {trustedDomains.length === 0 ? (
              <Text style={styles.noItemsText}>No trusted websites added.</Text>
            ) : (
              trustedDomains.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => removeDomain(d)}
                  style={[styles.chip, styles.chipTrusted]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove trusted domain: ${d}`}
                >
                  <Text style={[styles.chipText, styles.chipTextTrusted]}>{d} ✕</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
          <Text style={styles.fieldHint}>
            Trusted websites bypass content filters. Only add educational or verified sites.
          </Text>
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {saveSuccess ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Policy saved successfully.</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Save Policy"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: { marginBottom: Spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  toggleLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPage,
  },
  addBtn: {
    backgroundColor: Colors.denied,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnTrusted: {
    backgroundColor: Colors.approved,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  chipTrusted: {
    backgroundColor: Colors.approvedBg,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.denied,
    fontWeight: '600',
  },
  chipTextTrusted: {
    color: Colors.approved,
  },
  noItemsText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: Colors.deniedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: { color: Colors.denied, fontSize: FontSize.sm, fontWeight: '500' },
  successBox: {
    backgroundColor: Colors.approvedBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  successText: { color: Colors.approved, fontSize: FontSize.sm, fontWeight: '600' },
  saveBtn: { marginTop: Spacing.sm },
});
