// ============================================================
// VoteCapsule -- Capsule Review Screen (THE MAIN REVIEW SCREEN)
// apps/validator-mobile/src/screens/CapsuleReviewScreen.tsx
//
// - Top: Evidence image (tappable for full-screen zoom)
// - Section: AI Analysis -- confidence score, recommendation, flagged issues
// - Section: OCR Data -- extracted text fields (votes per candidate)
// - Section: Signature Status -- detected/not-detected, confidence
// - Section: Station Info -- station code, name, position, agent
// - Bottom action bar: [Approve] [Reject] [Escalate]
// - Reject/Escalate requires a reason (modal)
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ValidationDecision } from '../types';
import { useValidationStore } from '../store/validationStore';
import ConfidenceBadge from '../components/ConfidenceBadge';
import DecisionModal from '../components/DecisionModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CapsuleReview'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

export default function CapsuleReviewScreen({ route, navigation }: Props) {
  const { capsuleId } = route.params;
  const {
    currentCapsule,
    isLoadingCapsule,
    isSubmitting,
    submitError,
    fetchCapsuleDetail,
    submitDecision,
    escalate,
    clearSubmitError,
  } = useValidationStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [activeDecision, setActiveDecision] = useState<ValidationDecision | null>(null);

  useEffect(() => {
    fetchCapsuleDetail(capsuleId);
  }, [capsuleId]);

  const openDecisionModal = (decision: ValidationDecision) => {
    setActiveDecision(decision);
    setModalVisible(true);
  };

  const handleConfirm = async (reason: string) => {
    if (!currentCapsule || !activeDecision) return;
    try {
      if (activeDecision === ValidationDecision.ESCALATED) {
        await escalate(currentCapsule.id, reason);
      } else {
        await submitDecision(currentCapsule.id, activeDecision, reason);
      }
      setModalVisible(false);
      navigation.goBack();
    } catch {
      // Error is shown via submitError in store
    }
  };

  const handleImagePress = () => {
    if (currentCapsule?.imageUrl) {
      navigation.navigate('ImageViewer', {
        imageUrl: currentCapsule.imageUrl,
        title: currentCapsule.stationName,
      });
    }
  };

  if (isLoadingCapsule || !currentCapsule) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0B3C6D" size="large" />
        <Text style={styles.loadingText}>Loading capsule...</Text>
      </View>
    );
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'approve': return '#16a34a';
      case 'review': return '#d97706';
      case 'reject': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Evidence Image -- tappable for full-screen zoom */}
        <TouchableOpacity onPress={handleImagePress} activeOpacity={0.9}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentCapsule.imageUrl }}
              style={styles.evidenceImage}
              contentFit="contain"
              transition={200}
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageLabel}>Tap to zoom</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Analysis Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>

          {/* Confidence Score */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Confidence</Text>
            <ConfidenceBadge confidence={currentCapsule.aiConfidence} size="medium" />
          </View>

          {/* AI Recommendation */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Recommendation</Text>
            <View style={[styles.recBadge, { backgroundColor: getRecommendationColor(currentCapsule.aiRecommendation) + '20' }]}>
              <Text style={[styles.recText, { color: getRecommendationColor(currentCapsule.aiRecommendation) }]}>
                {currentCapsule.aiRecommendation.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Flagged Issues */}
          {currentCapsule.ocrData.flaggedIssues.length > 0 && (
            <View style={styles.flaggedSection}>
              <Text style={styles.flaggedTitle}>Flagged Issues:</Text>
              {currentCapsule.ocrData.flaggedIssues.map((issue, idx) => (
                <Text key={idx} style={styles.flaggedItem}>- {issue}</Text>
              ))}
            </View>
          )}
        </View>

        {/* OCR Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OCR Extracted Data</Text>
          {Object.keys(currentCapsule.ocrData.votes).length > 0 ? (
            <View style={styles.votesTable}>
              <View style={styles.votesHeader}>
                <Text style={styles.votesHeaderText}>Candidate</Text>
                <Text style={styles.votesHeaderText}>Votes</Text>
              </View>
              {Object.entries(currentCapsule.ocrData.votes).map(([candidate, votes]) => (
                <View key={candidate} style={styles.votesRow}>
                  <Text style={styles.votesCandidate}>{candidate}</Text>
                  <Text style={styles.votesCount}>{votes}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>No vote data extracted</Text>
          )}
          {currentCapsule.ocrData.extractedText ? (
            <ScrollView style={styles.ocrScroll} nestedScrollEnabled>
              <Text style={styles.ocrText}>{currentCapsule.ocrData.extractedText}</Text>
            </ScrollView>
          ) : null}
        </View>

        {/* Signature Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature Verification</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={[styles.sigBadge, currentCapsule.signatureStatus.detected ? styles.sigDetected : styles.sigNotDetected]}>
              <Text style={[styles.sigText, { color: currentCapsule.signatureStatus.detected ? '#16a34a' : '#dc2626' }]}>
                {currentCapsule.signatureStatus.detected ? 'Detected' : 'Not Detected'}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Confidence</Text>
            <Text style={styles.rowValue}>{Math.round(currentCapsule.signatureStatus.confidence)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Signatures Found</Text>
            <Text style={styles.rowValue}>{currentCapsule.signatureStatus.count}</Text>
          </View>
        </View>

        {/* Station Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Station Information</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Station Code</Text>
            <Text style={styles.rowValue}>{currentCapsule.stationCode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Station Name</Text>
            <Text style={styles.rowValue}>{currentCapsule.stationName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Position</Text>
            <Text style={styles.rowValue}>{currentCapsule.position}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Agent</Text>
            <Text style={styles.rowValue}>{currentCapsule.agentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Submitted</Text>
            <Text style={styles.rowValue}>
              {new Date(currentCapsule.submittedAt).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Error display */}
        {submitError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{submitError}</Text>
            <TouchableOpacity onPress={clearSubmitError}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => openDecisionModal(ValidationDecision.APPROVED)}
          disabled={isSubmitting}
        >
          <Text style={styles.actionButtonText}>APPROVE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => openDecisionModal(ValidationDecision.REJECTED)}
          disabled={isSubmitting}
        >
          <Text style={styles.actionButtonText}>REJECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.escalateButton]}
          onPress={() => openDecisionModal(ValidationDecision.ESCALATED)}
          disabled={isSubmitting}
        >
          <Text style={styles.actionButtonText}>ESCALATE</Text>
        </TouchableOpacity>
      </View>

      {/* Decision Modal */}
      <DecisionModal
        visible={modalVisible}
        decision={activeDecision}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Image
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: '#1f2937',
    position: 'relative',
  },
  evidenceImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageLabel: { color: '#ffffff', fontSize: 11 },

  // Sections
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: { fontSize: 14, color: '#4b5563' },
  rowValue: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // AI Recommendation badge
  recBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  recText: { fontSize: 12, fontWeight: '700' },

  // Flagged issues
  flaggedSection: { marginTop: 8, backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  flaggedTitle: { fontSize: 13, fontWeight: '600', color: '#dc2626', marginBottom: 4 },
  flaggedItem: { fontSize: 12, color: '#7f1d1d', marginLeft: 8, marginTop: 2 },

  // Votes table
  votesTable: { marginBottom: 12 },
  votesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  votesHeaderText: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  votesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  votesCandidate: { fontSize: 14, color: '#374151' },
  votesCount: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  noData: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },

  // OCR text
  ocrScroll: {
    maxHeight: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ocrText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Signature
  sigBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sigDetected: { backgroundColor: '#dcfce7' },
  sigNotDetected: { backgroundColor: '#fef2f2' },
  sigText: { fontSize: 12, fontWeight: '600' },

  // Error
  errorBanner: {
    backgroundColor: '#fef2f2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1 },
  errorDismiss: { color: '#dc2626', fontSize: 13, fontWeight: '600', marginLeft: 8 },

  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: { backgroundColor: '#16a34a' },
  rejectButton: { backgroundColor: '#dc2626' },
  escalateButton: { backgroundColor: '#d97706' },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
