// ============================================================
// VoteCapsule -- Validation History Screen
// apps/validator-mobile/src/screens/HistoryScreen.tsx
//
// FlatList of past decisions (capsuleId, decision badge, reason, timestamp)
// ============================================================
import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ValidationHistory, ValidationDecision } from '../types';
import { useValidationStore } from '../store/validationStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { history, fetchHistory, isLoadingQueue } = useValidationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getDecisionColor = (decision: ValidationDecision) => {
    switch (decision) {
      case ValidationDecision.APPROVED: return '#16a34a';
      case ValidationDecision.REJECTED: return '#dc2626';
      case ValidationDecision.ESCALATED: return '#d97706';
      default: return '#6b7280';
    }
  };

  const getDecisionBg = (decision: ValidationDecision) => {
    switch (decision) {
      case ValidationDecision.APPROVED: return '#dcfce7';
      case ValidationDecision.REJECTED: return '#fef2f2';
      case ValidationDecision.ESCALATED: return '#fef3c7';
      default: return '#f3f4f6';
    }
  };

  const renderItem = ({ item }: { item: ValidationHistory }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CapsuleReview', { capsuleId: item.capsuleId })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.decisionBadge, { backgroundColor: getDecisionBg(item.decision) }]}>
          <Text style={[styles.decisionText, { color: getDecisionColor(item.decision) }]}>
            {item.decision}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.decidedAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.capsuleId}>Capsule: {item.capsuleId.slice(0, 8)}...</Text>
        {item.reason ? (
          <Text style={styles.reason} numberOfLines={2}>Reason: {item.reason}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No History</Text>
      <Text style={styles.emptyText}>
        You have not reviewed any capsules yet.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0B3C6D"
            colors={['#0B3C6D']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  decisionText: { fontSize: 11, fontWeight: '700' },
  timestamp: { fontSize: 11, color: '#6b7280' },
  cardBody: { gap: 4 },
  capsuleId: { fontSize: 13, color: '#374151', fontWeight: '500' },
  reason: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
