import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();

    const subscription = supabase
      .channel('points-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_history',
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.family_id]);

  const loadLeaderboard = async () => {
    try {
      const { data: children, error: childrenError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', profile?.family_id)
        .eq('role', 'child');

      if (childrenError) throw childrenError;

      const leaderboardData = await Promise.all(
        (children || []).map(async (child) => {
          const { data: points, error: pointsError } = await supabase
            .from('points_history')
            .select('points_earned')
            .eq('user_id', child.id);

          if (pointsError) throw pointsError;

          const totalPoints = points?.reduce((sum, p) => sum + p.points_earned, 0) || 0;

          const { count, error: countError } = await supabase
            .from('chores')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', child.id)
            .eq('status', 'completed');

          if (countError) throw countError;

          return {
            ...child,
            totalPoints,
            completedChores: count || 0,
          };
        })
      );

      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
  };

  const getMedalColor = (rank) => {
    if (rank === 0) return ['#fbbf24', '#f59e0b'];
    if (rank === 1) return ['#d1d5db', '#9ca3af'];
    if (rank === 2) return ['#fb923c', '#f97316'];
    return ['#f3f4f6', '#e5e7eb'];
  };

  const renderPlayer = ({ item, index }) => {
    const [colorStart, colorEnd] = getMedalColor(index);
    const medal = getMedalEmoji(index);

    return (
      <View style={[styles.playerCard, { backgroundColor: colorStart }]}>
        <View style={styles.playerRank}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
          {medal && <Text style={styles.medal}>{medal}</Text>}
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerAvatar}>{item.avatar}</Text>
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerStats}>{item.completedChores} chores completed</Text>
          </View>
        </View>

        <View style={styles.playerPoints}>
          <Text style={styles.pointsNumber}>{item.totalPoints}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <Text style={styles.headerSubtitle}>Who&apos;s crushing it this week?</Text>
      </View>

      {leaderboard.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyText}>No points yet!</Text>
          <Text style={styles.emptySubtext}>Complete chores to get on the board</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLeaderboard} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'white', opacity: 0.9 },
  list: { padding: 16 },
  playerCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  playerRank: { width: 50, alignItems: 'center' },
  rankNumber: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  medal: { fontSize: 20, marginTop: 4 },
  playerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  playerAvatar: { fontSize: 32, marginRight: 12 },
  playerDetails: { flex: 1 },
  playerName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  playerStats: { fontSize: 13, color: '#4b5563' },
  playerPoints: { alignItems: 'flex-end' },
  pointsNumber: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
  pointsLabel: { fontSize: 12, color: '#6b7280' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6b7280' },
});