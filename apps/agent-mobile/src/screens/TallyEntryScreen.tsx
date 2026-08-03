// ============================================================
// VoteCapsule™ — Tally Entry Screen
// apps/agent-mobile/src/screens/TallyEntryScreen.tsx
//
// Shown after ReviewScreen. Agent manually keys in the tally
// figures from the official IEBC result form:
//   Form 34A → Presidential  (includes running mate)
//   Form 35A → MP
//   Form 36A → MCA
//   Form 37A → Governor / Senator / Women's Rep
//
// The screen is OPTIONAL — agents can skip it. Photo-only
// submission is always valid.
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import {
  RootStackParamList,
  CandidateTally,
  FormTallyData,
  FormTypeA,
  getFormType,
  FORM_LABELS,
  validateFormATally,
  FormAMeta,
} from '../types';
import { getCapsule } from '../utils/storage';
import { updateCapsule } from '../utils/storage';
import { useCaptureStore } from '../store/captureStore';
import { useFocusEffect } from '@react-navigation/native';
import { submitTallyData } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TallyEntry'>;
  route: RouteProp<RootStackParamList, 'TallyEntry'>;
};

const MAX_CANDIDATES = 15;

// ── Candidate row state (local — includes a UI key) ──────────

interface CandidateRow extends Partial<CandidateTally> {
  _key: string; // local React key only, not persisted
}

function makeRow(): CandidateRow {
  return {
    _key:              Math.random().toString(36).slice(2),
    ballotNumber:      undefined,
    candidateName:     '',
    runningMateName:   '',
    partyAbbreviation: '',
    votes:             undefined,
  };
}

// ── Helper: parse a numeric text field ───────────────────────

function parseNum(v: string): number | undefined {
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}

export default function TallyEntryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { resetSession } = useCaptureStore();

  // Capsule metadata (loaded once on focus)
  const [positionCode, setPositionCode] = useState<string>('');
  const [stationName, setStationName]   = useState<string>('');
  const [registeredVotersDefault, setRegisteredVotersDefault] = useState<number | undefined>();

  // Station totals
  const [registeredVoters, setRegisteredVoters] = useState('');
  const [ballotsIssued, setBallotsIssued]       = useState('');
  const [spoiltBallots, setSpoiltBallots]       = useState('');
  const [rejectedBallots, setRejectedBallots]   = useState('');
  const [validVotes, setValidVotes]             = useState('');
  const [validVotesDirty, setValidVotesDirty]   = useState(false);

  // Candidate rows
  const [candidates, setCandidates] = useState<CandidateRow[]>([makeRow()]);

  // Presiding officer
  const [presidingOfficer, setPresidingOfficer] = useState('');

  // ── Load capsule metadata on screen focus ─────────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const capsule = await getCapsule(route.params.localId);
        if (!capsule) return;
        setPositionCode(capsule.positionCode);
        setStationName(capsule.iebcStationCode);
        // Pre-fill from NEC if we can get it from the capsule's station data
        // (The capsule itself doesn't store registeredVoters, but we do our best)
        setRegisteredVotersDefault(undefined);
      })();
    }, [route.params.localId]),
  );

  // ── Derived values ────────────────────────────────────────

  const formType = positionCode
    ? getFormType(positionCode as any)
    : 'FORM_35A';
  const isPresidential = formType === 'FORM_34A';
  const isGovernor     = formType === 'FORM_37A'; // Deputy Governor field
  const formDescription = FORM_LABELS[formType as FormTypeA] ?? formType;

  const formLabel = FORM_LABELS;

  const positionLabel: Record<string, string> = {
    PRESIDENT:  'Presidential',
    GOVERNOR:   'Governor',
    SENATOR:    'Senator',
    WOMEN_REP:  "Women's Rep",
    MP:         'MP',
    MCA:        'MCA',
  };

  // Auto-calculate valid votes unless the user has manually edited it
  const autoValidVotes = (): string => {
    const issued   = parseNum(ballotsIssued);
    const spoilt   = parseNum(spoiltBallots);
    const rejected = parseNum(rejectedBallots);
    if (issued !== undefined && spoilt !== undefined && rejected !== undefined) {
      return String(issued - spoilt - rejected);
    }
    return '';
  };

  const displayValidVotes = validVotesDirty ? validVotes : (autoValidVotes() || validVotes);

  // Candidate votes sum vs valid votes warning
  const candidateVotesSum = candidates.reduce((acc, c) => acc + (c.votes ?? 0), 0);
  const parsedValidVotes  = parseNum(displayValidVotes);
  const sumMismatch =
    parsedValidVotes !== undefined &&
    candidateVotesSum > 0 &&
    candidateVotesSum !== parsedValidVotes;

  // ── Candidate row handlers ────────────────────────────────

  const addCandidate = () => {
    if (candidates.length >= MAX_CANDIDATES) {
      Alert.alert('Maximum reached', `A maximum of ${MAX_CANDIDATES} candidates is supported.`);
      return;
    }
    setCandidates((prev) => [...prev, makeRow()]);
  };

  const updateCandidate = (key: string, patch: Partial<CandidateRow>) => {
    setCandidates((prev) =>
      prev.map((c) => (c._key === key ? { ...c, ...patch } : c)),
    );
  };

  const removeCandidate = (key: string) => {
    setCandidates((prev) => prev.filter((c) => c._key !== key));
  };

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validate required fields
    const vv = parseNum(displayValidVotes);
    if (!presidingOfficer.trim()) {
      Alert.alert('Missing field', 'Presiding officer name is required.');
      return;
    }
    if (vv === undefined) {
      Alert.alert('Missing field', 'Valid votes count is required.');
      return;
    }

    // Validate candidates: at least one with votes entered
    const filledCandidates = candidates.filter(
      (c) => c.candidateName?.trim() && c.votes !== undefined,
    );
    if (filledCandidates.length === 0) {
      Alert.alert(
        'No candidates',
        'Please enter at least one candidate with a name and vote count.',
      );
      return;
    }

    // Validate no negative votes
    const hasNegative = filledCandidates.some((c) => (c.votes ?? 0) < 0);
    if (hasNegative) {
      Alert.alert('Invalid votes', 'Vote counts cannot be negative.');
      return;
    }

    // Warn if sum doesn't match (but do not block — presiding officer may have made an error)
    if (sumMismatch) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Votes Sum Mismatch',
          `Candidate votes sum (${candidateVotesSum}) does not equal valid votes (${parsedValidVotes}). Proceed anyway?`,
          [
            { text: 'Go Back', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Proceed', style: 'destructive', onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    const now = new Date().toISOString();

    const tallyData: FormTallyData = {
      formType,
      registeredVoters:     parseNum(registeredVoters) ?? 0,
      ballotsIssued:        parseNum(ballotsIssued)    ?? 0,
      spoiltBallots:        parseNum(spoiltBallots)    ?? 0,
      rejectedBallots:      parseNum(rejectedBallots)  ?? 0,
      validVotes:           vv,
      candidates: filledCandidates.map((c) => ({
        ballotNumber:      c.ballotNumber ?? 0,
        candidateName:     c.candidateName?.trim() ?? '',
        ...(isPresidential && c.runningMateName?.trim()
          ? { runningMateName: c.runningMateName.trim() }
          : {}),
        ...(isGovernor && c.deputyName?.trim()
          ? { deputyName: c.deputyName.trim() }
          : {}),
        partyAbbreviation: c.partyAbbreviation?.trim().toUpperCase() ?? 'IND',
        partyName:         c.partyName?.trim() ?? undefined,
        votes:             c.votes ?? 0,
      })),
      presidingOfficerName: presidingOfficer.trim(),
      declaredAt:           now,
    };

    // ── Run full mathematical validation (IEBC rules) ─────
    const validation = validateFormATally(tallyData);

    if (!validation.valid) {
      // Hard errors — must fix before submitting
      const blocked = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '⚠️  Form Errors — Cannot Submit',
          [
            'The following errors must be corrected:',
            '',
            ...validation.errors.map((e, i) => `${i + 1}. ${e}`),
            '',
            'Please correct the figures and resubmit.',
          ].join('\n'),
          [
            { text: 'Fix Errors', style: 'cancel', onPress: () => resolve(true) },
          ],
        );
      });
      if (blocked) return; // stay on screen
    }

    if (validation.warnings.length > 0) {
      // Soft warnings — can proceed but presiding officer must confirm
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Review Warnings',
          [
            'Please review the following:',
            '',
            ...validation.warnings.map((w, i) => `${i + 1}. ${w}`),
            '',
            'Has the Presiding Officer reviewed and confirmed these figures?',
          ].join('\n'),
          [
            { text: 'Review Again', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirmed — Submit', style: 'default', onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    // Persist validated tally data to the capsule in AsyncStorage
    await updateCapsule(route.params.localId, { tallyData });

    // If the capsule is already uploaded (has a serverId), send tally data to server now.
    // If not yet uploaded, the syncEngine will include tallyData in the upload FormData.
    const latestCapsule = await getCapsule(route.params.localId);
    if (latestCapsule?.serverId) {
      try {
        await submitTallyData(latestCapsule.serverId, {
          formType:             tallyData.formType,
          registeredVoters:     tallyData.registeredVoters,
          ballotsIssued:        tallyData.ballotsIssued,
          spoiltBallots:        tallyData.spoiltBallots,
          rejectedBallots:      tallyData.rejectedBallots,
          validVotes:           tallyData.validVotes,
          candidates:           tallyData.candidates.map((c) => ({
            ballotNumber:      c.ballotNumber,
            candidateName:     c.candidateName,
            runningMateName:   c.runningMateName,
            deputyName:        c.deputyName,
            partyAbbreviation: c.partyAbbreviation,
            votes:             c.votes,
          })),
          presidingOfficerName: tallyData.presidingOfficerName,
          declaredAt:           tallyData.declaredAt,
        });
      } catch (err: unknown) {
        // Non-fatal — tally is saved locally, sync will retry
        console.warn('Failed to send tally to server (will retry on next sync):', err);
      }
    }

    // Reset capture session and navigate to queue
    resetSession();
    navigation.replace('Queue');
  };

  // ── Skip / cancel ─────────────────────────────────────────

  const handleSkip = () => {
    Alert.alert(
      'Skip Tally Entry?',
      'The capsule will be submitted as photo-only. You can enter tally data later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            resetSession();
            navigation.replace('Queue');
          },
        },
      ],
    );
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Text style={styles.header}>
          {positionCode ? `${formLabel[formType]} — ${positionLabel[positionCode] ?? positionCode}` : 'Enter Tally Data'}
        </Text>
        {stationName ? (
          <Text style={styles.subHeader}>Station: {stationName}</Text>
        ) : null}
        <Text style={styles.required}>* All fields are optional except where marked</Text>

        {/* ── Section: Station Totals ────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Station Totals</Text>

          <NumericField
            label="Registered Voters"
            value={registeredVoters}
            placeholder={registeredVotersDefault !== undefined ? String(registeredVotersDefault) : '0'}
            onChangeText={setRegisteredVoters}
          />
          <NumericField
            label="Ballots Issued"
            value={ballotsIssued}
            onChangeText={setBallotsIssued}
          />
          <NumericField
            label="Spoilt Ballots"
            value={spoiltBallots}
            onChangeText={setSpoiltBallots}
          />
          <NumericField
            label="Rejected Ballots"
            value={rejectedBallots}
            onChangeText={setRejectedBallots}
          />

          {/* Valid votes: auto-calculated but editable */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Valid Votes *</Text>
            <TextInput
              style={[styles.fieldInput, sumMismatch && styles.fieldInputWarning]}
              value={displayValidVotes}
              onChangeText={(v) => {
                setValidVotes(v);
                setValidVotesDirty(true);
              }}
              keyboardType="number-pad"
              placeholder="Auto-calculated"
              placeholderTextColor="#475569"
            />
            {!validVotesDirty && autoValidVotes() !== '' && (
              <Text style={styles.autoCalcHint}>auto</Text>
            )}
          </View>
        </View>

        {/* ── Section: Candidate Tallies ─────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Candidate Tallies ({candidates.length}/{MAX_CANDIDATES})
          </Text>

          {candidates.map((row, idx) => (
            <View key={row._key} style={styles.candidateCard}>
              {/* Row header */}
              <View style={styles.candidateHeader}>
                <Text style={styles.candidateIndex}>Candidate #{idx + 1}</Text>
                {candidates.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeCandidate(row._key)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Ballot number */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Ballot No.</Text>
                <TextInput
                  style={styles.fieldInputSmall}
                  value={row.ballotNumber !== undefined ? String(row.ballotNumber) : ''}
                  onChangeText={(v) =>
                    updateCandidate(row._key, { ballotNumber: parseNum(v) })
                  }
                  keyboardType="number-pad"
                  placeholder="#"
                  placeholderTextColor="#475569"
                />
              </View>

              {/* Candidate name */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={row.candidateName ?? ''}
                  onChangeText={(v) => updateCandidate(row._key, { candidateName: v })}
                  placeholder="Full name as on ballot"
                  placeholderTextColor="#475569"
                  autoCapitalize="words"
                />
              </View>

              {/* Running mate — Presidential (Form 34A) only */}
              {isPresidential && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Running Mate (Deputy President)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={row.runningMateName ?? ''}
                    onChangeText={(v) => updateCandidate(row._key, { runningMateName: v })}
                    placeholder="Deputy President candidate name"
                    placeholderTextColor="#475569"
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Deputy Governor — Governor (Form 37A) only */}
              {isGovernor && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Deputy Governor</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={row.deputyName ?? ''}
                    onChangeText={(v) => updateCandidate(row._key, { deputyName: v })}
                    placeholder="Deputy Governor candidate name"
                    placeholderTextColor="#475569"
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Party abbreviation */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Party</Text>
                <TextInput
                  style={[styles.fieldInputSmall, styles.monoInput]}
                  value={row.partyAbbreviation ?? ''}
                  onChangeText={(v) =>
                    updateCandidate(row._key, { partyAbbreviation: v.toUpperCase() })
                  }
                  placeholder="UDA"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              {/* Votes */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Votes *</Text>
                <TextInput
                  style={styles.fieldInputSmall}
                  value={row.votes !== undefined ? String(row.votes) : ''}
                  onChangeText={(v) => updateCandidate(row._key, { votes: parseNum(v) })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#475569"
                />
              </View>
            </View>
          ))}

          {/* Add candidate button */}
          {candidates.length < MAX_CANDIDATES && (
            <TouchableOpacity style={styles.addCandidateBtn} onPress={addCandidate}>
              <Text style={styles.addCandidateText}>+ Add Candidate</Text>
            </TouchableOpacity>
          )}

          {/* Running total vs valid votes */}
          {candidateVotesSum > 0 && (
            <View style={[styles.sumRow, sumMismatch && styles.sumRowWarn]}>
              <Text style={[styles.sumLabel, sumMismatch && styles.sumLabelWarn]}>
                Candidate votes total:
              </Text>
              <Text style={[styles.sumValue, sumMismatch && styles.sumValueWarn]}>
                {candidateVotesSum.toLocaleString()}
              </Text>
              {sumMismatch && (
                <Text style={styles.sumMismatchHint}>
                  ≠ valid votes ({parsedValidVotes?.toLocaleString()})
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── Section: Declaration ───────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Declaration</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Presiding Officer *</Text>
            <TextInput
              style={styles.fieldInput}
              value={presidingOfficer}
              onChangeText={setPresidingOfficer}
              placeholder="Officer's full name"
              placeholderTextColor="#475569"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* ── Actions ────────────────────────────────────────── */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Record & Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip Tally (photo only)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Reusable numeric field ────────────────────────────────────

interface NumericFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (v: string) => void;
}

function NumericField({ label, value, placeholder, onChangeText }: NumericFieldProps) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInputSmall}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder={placeholder ?? '0'}
        placeholderTextColor="#475569"
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: '#0a1628' },
  container:   { flex: 1, backgroundColor: '#0a1628' },

  // Header
  header:      { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subHeader:   { color: '#64748b', fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  required:    { color: '#475569', fontSize: 11, marginBottom: 18 },

  // Section cards
  sectionCard: {
    backgroundColor: '#0f1e35',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: { color: '#60a5fa', fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Field rows
  fieldRow:   {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  fieldLabel: { color: '#94a3b8', fontSize: 13, width: 110, flexShrink: 0 },
  fieldInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldInputSmall: {
    width: 90,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f1f5f9',
    fontSize: 14,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldInputWarning: { borderColor: '#f59e0b' },
  monoInput:  { fontFamily: 'monospace' },
  autoCalcHint: { color: '#475569', fontSize: 10, marginLeft: 4 },

  // Candidate cards
  candidateCard: {
    backgroundColor: '#0a1628',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  candidateIndex:  { color: '#64748b', fontSize: 12, fontWeight: '600' },
  removeBtn:       { paddingVertical: 2, paddingHorizontal: 6 },
  removeBtnText:   { color: '#ef4444', fontSize: 12 },

  // Add candidate
  addCandidateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  addCandidateText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },

  // Running sum row
  sumRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, padding: 8, backgroundColor: '#0a1628', borderRadius: 6 },
  sumRowWarn:      { backgroundColor: '#2d1a00' },
  sumLabel:        { color: '#64748b', fontSize: 12 },
  sumLabelWarn:    { color: '#f59e0b' },
  sumValue:        { color: '#22c55e', fontSize: 13, fontWeight: '700' },
  sumValueWarn:    { color: '#f59e0b' },
  sumMismatchHint: { color: '#f59e0b', fontSize: 11, flex: 1 },

  // Submit / skip
  submitBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn:       { borderRadius: 10, padding: 14, alignItems: 'center' },
  skipBtnText:   { color: '#64748b', fontSize: 13 },
});
