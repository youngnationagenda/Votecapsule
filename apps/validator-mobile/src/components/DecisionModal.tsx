// ============================================================
// VoteCapsule -- Decision Modal Component
// apps/validator-mobile/src/components/DecisionModal.tsx
//
// Modal for rejection/escalation with:
// - Predefined reasons: "Image unclear", "Data mismatch",
//   "Missing signatures", "Suspicious tampering", "Other"
// - Free-text notes field
// - Confirm/Cancel buttons
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ValidationDecision } from '../types';

interface DecisionModalProps {
  visible: boolean;
  decision: ValidationDecision | null;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const PREDEFINED_REASONS = [
  'Image unclear',
  'Data mismatch',
  'Missing signatures',
  'Suspicious tampering',
  'Other',
];

export default function DecisionModal({
  visible,
  decision,
  isSubmitting,
  onConfirm,
  onCancel,
}: DecisionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setNotes('');
    }
  }, [visible]);

  const handleConfirm = () => {
    if (decision === ValidationDecision.APPROVED) {
      onConfirm(notes.trim() || 'Approved - data verified');
      return;
    }
    // For reject/escalate, reason is mandatory
    if (!selectedReason && !notes.trim()) return;
    const reason = selectedReason === 'Other'
      ? notes.trim()
      : `${selectedReason}${notes.trim() ? ` - ${notes.trim()}` : ''}`;
    onConfirm(reason);
  };

  const handleCancel = () => {
    setSelectedReason(null);
    setNotes('');
    onCancel();
  };

  const getTitle = () => {
    switch (decision) {
      case ValidationDecision.APPROVED: return 'Confirm Approval';
      case ValidationDecision.REJECTED: return 'Confirm Rejection';
      case ValidationDecision.ESCALATED: return 'Confirm Escalation';
      default: return '';
    }
  };

  const getColor = () => {
    switch (decision) {
      case ValidationDecision.APPROVED: return '#16a34a';
      case ValidationDecision.REJECTED: return '#dc2626';
      case ValidationDecision.ESCALATED: return '#d97706';
      default: return '#6b7280';
    }
  };

  const requiresReason = decision === ValidationDecision.REJECTED || decision === ValidationDecision.ESCALATED;
  const canSubmit = decision === ValidationDecision.APPROVED || selectedReason || notes.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{getTitle()}</Text>

            {/* Warning */}
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                This decision is FINAL and will be recorded in the audit trail.
              </Text>
            </View>

            {/* Predefined reason picker (for reject/escalate) */}
            {requiresReason && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reason (required)</Text>
                {PREDEFINED_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <View style={[styles.radio, selectedReason === reason && styles.radioSelected]} />
                    <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes / free-text */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {decision === ValidationDecision.APPROVED
                  ? 'Notes (optional)'
                  : selectedReason === 'Other'
                    ? 'Reason details (required)'
                    : 'Additional notes (optional)'}
              </Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  decision === ValidationDecision.ESCALATED
                    ? 'Describe why this needs senior review...'
                    : decision === ValidationDecision.REJECTED
                      ? 'Provide additional details...'
                      : 'Add any notes...'
                }
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: getColor() },
                  (!canSubmit || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Submit Decision</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
  },
  reasonOptionSelected: {
    backgroundColor: '#fef2f2',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
  reasonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  reasonTextSelected: {
    color: '#1f2937',
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
