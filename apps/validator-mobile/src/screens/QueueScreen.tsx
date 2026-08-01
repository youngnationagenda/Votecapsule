// ============================================================
// VoteCapsule -- Validation Queue Screen
// apps/validator-mobile/src/screens/QueueScreen.tsx
//
// FlatList of pending capsules with:
// - Station name + code
// - Position being reviewed
// - AI confidence badge (green >0.9, yellow 0.7-0.9, red <0.7)
// - Time in queue
// - Priority indicator
// - Pull to refresh
// ============================================================
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CapsuleForReview } from '../types';
import { useValidationStore } from '../store/validationStore';
import CapsuleCard from '../components/CapsuleCard';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function QueueScreen() {
  const navigation = useNavigation<NavProp>();
  const { queue, queueTotal, isLoadingQueue, fetchQueue, refreshQueue } = useValidationStore();

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRefresh = useCallback(() => {
    refreshQueue();
  }, []);

  const handlePressCapsule = (capsuleId: string) => {
    navigation.navigate('CapsuleReview', { capsuleId });
  };

  const renderItem = ({ item }: { item: CapsuleForReview }) => (
    <CapsuleCard capsule={item} onPress={() => handlePressCapsule(item.id)} />
  );

  const renderEmpty = () => {
    if (isLoadingQueue) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Queue Empty</Text>
        <Text style={styles.emptyText}>
          No capsules awaiting review. Pull down to refresh.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Queue count banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          {queueTotal} capsule{queueTotal !== 1 ? 's' : ''} awaiting review
        </Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingQueue}
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
  banner: {
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  bannerText: { color: '#1e40af', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },
});
