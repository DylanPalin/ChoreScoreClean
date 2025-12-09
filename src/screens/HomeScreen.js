import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AddChoreModal from '../components/AddChoreModal';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const [chores, setChores] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const isParent = profile?.role === 'parent';

  useEffect(() => {
    loadChores();
    if (!isParent && user?.id) {
      loadUserPoints();
    }

    const subscription = supabase
      .channel('chores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chores',
          filter: `family_id=eq.${profile?.family_id}`,
        },
        () => {
          loadChores();
          if (!isParent && user?.id) {
            loadUserPoints();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.family_id]);

  const loadChores = async () => {
    try {
      const { data, error } = await supabase
        .from('chores')
        .select(`
          *,
          assigned:profiles!assigned_to(name, avatar),
          creator:profiles!created_by(name)
        `)
        .eq('family_id', profile?.family_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChores(data || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserPoints = async () => {
    try {
      const { data: points, error } = await supabase
        .from('points_history')
        .select('points_earned')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalPoints = points?.reduce((sum, p) => sum + p.points_earned, 0) || 0;
      setUserPoints(totalPoints);
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  };

  const isChoreAvailable = (chore) => {
    if (!chore.available_at) return true;
    return new Date(chore.available_at) <= new Date();
  };

  const getNextWeekDate = () => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    return next.toISOString();
  };

  const handleMarkComplete = async (choreId) => {
    const chore = chores.find(c => c.id === choreId);
    
    // Optimistically update the UI immediately
    setChores(chores.map(c => 
      c.id === choreId 
        ? { ...c, status: 'pending-approval', completed_at: new Date().toISOString() } 
        : c
    ));

    try {
      const { error } = await supabase
        .from('chores')
        .update({
          status: 'pending-approval',
          completed_at: new Date().toISOString(),
        })
        .eq('id', choreId);

      if (error) {
        setChores(chores.map(c => 
          c.id === choreId 
            ? { ...c, status: 'pending', completed_at: null } 
            : c
        ));
        throw error;
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleApprove = async (chore) => {
    const isWeekly = chore.recurrence === 'weekly';
    
    // Optimistic update
    setChores(chores.map(c => 
      c.id === chore.id 
        ? { 
            ...c, 
            status: 'completed', 
            approved_at: new Date().toISOString(),
            available_at: isWeekly ? getNextWeekDate() : c.available_at,
          } 
        : c
    ));

    try {
      const updateData = {
        status: 'completed',
        approved_at: new Date().toISOString(),
      };

      // If weekly, set next available date
      if (isWeekly) {
        updateData.available_at = getNextWeekDate();
      }

      const { error: choreError } = await supabase
        .from('chores')
        .update(updateData)
        .eq('id', chore.id);

      if (choreError) throw choreError;

      const { error: pointsError } = await supabase
        .from('points_history')
        .insert([
          {
            user_id: chore.assigned_to,
            chore_id: chore.id,
            points_earned: chore.points,
          },
        ]);

      if (pointsError) throw pointsError;

      // Only create new instance for daily recurring
      if (chore.recurrence === 'daily') {
        const { error: recurError } = await supabase
          .from('chores')
          .insert([
            {
              title: chore.title,
              description: chore.description,
              points: chore.points,
              assigned_to: chore.assigned_to,
              created_by: chore.created_by,
              family_id: chore.family_id,
              status: 'pending',
              recurrence: chore.recurrence,
              recurrence_day: chore.recurrence_day,
              available_at: new Date().toISOString(),
            },
          ]);

        if (recurError) throw recurError;
      }

      Alert.alert('Success', `${chore.assigned.name} earned ${chore.points} points!`);
    } catch (error) {
      loadChores();
      Alert.alert('Error', error.message);
    }
  };

  const handleReject = async (choreId) => {
    setChores(chores.map(c => 
      c.id === choreId 
        ? { ...c, status: 'pending', completed_at: null } 
        : c
    ));

    try {
      const { error } = await supabase
        .from('chores')
        .update({
          status: 'pending',
          completed_at: null,
        })
        .eq('id', choreId);

      if (error) throw error;
    } catch (error) {
      loadChores();
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteChore = async (choreId) => {
    Alert.alert(
      'Delete Chore',
      'Are you sure you want to delete this chore?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chores')
                .delete()
                .eq('id', choreId);

              if (error) throw error;
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Organize chores into sections
  const organizeChoresToSections = () => {
    const myChores = isParent ? chores : chores.filter(c => c.assigned_to === user.id);
    
    const pendingApproval = myChores.filter(c => c.status === 'pending-approval');
    const activePending = myChores.filter(c => 
      c.status === 'pending' && 
      c.recurrence !== 'weekly' && 
      isChoreAvailable(c)
    );
    const weeklyAvailable = myChores.filter(c => 
      c.status === 'pending' && 
      c.recurrence === 'weekly' &&
      isChoreAvailable(c)
    );
    const weeklyCompleted = myChores.filter(c => 
      c.status === 'completed' && 
      c.recurrence === 'weekly' &&
      !isChoreAvailable(c)
    );
    const archived = myChores.filter(c => 
      c.status === 'completed' && 
      (c.recurrence === 'none' || c.recurrence === 'daily' || !c.recurrence)
    );

    const sections = [];

    if (pendingApproval.length > 0) {
      sections.push({ title: '⭐ Needs Approval', data: pendingApproval });
    }
    if (activePending.length > 0) {
      sections.push({ title: '📋 To Do', data: activePending });
    }
    if (weeklyAvailable.length > 0) {
      sections.push({ title: '🗓️ Weekly Chores', data: weeklyAvailable });
    }
    if (weeklyCompleted.length > 0) {
      sections.push({ title: '✅ Completed This Week', data: weeklyCompleted, greyed: true });
    }
    if (archived.length > 0) {
      sections.push({ title: '📦 Archived', data: archived, greyed: true });
    }

    return sections;
  };

  const renderChore = ({ item, section }) => {
    const isMyChore = item.assigned_to === user.id;
    const isPending = item.status === 'pending';
    const isPendingApproval = item.status === 'pending-approval';
    const isCompleted = item.status === 'completed';
    const isGreyed = section.greyed || !isChoreAvailable(item);

    return (
      <View style={[
        styles.choreCard,
        isPendingApproval && styles.choreCardApproval,
        isGreyed && styles.choreCardGreyed,
      ]}>
        <View style={styles.choreHeader}>
          <View style={styles.choreInfo}>
            <Text style={styles.choreTitle}>{item.title}</Text>
            <Text style={styles.choreAssignee}>
              {item.assigned.avatar} {item.assigned.name}
            </Text>
            {item.recurrence && item.recurrence !== 'none' && (
              <View style={styles.recurrenceBadge}>
                <Text style={styles.recurrenceText}>
                  🔄 {item.recurrence === 'daily' ? 'Daily' : 'Weekly'}
                  {item.recurrence === 'weekly' && item.recurrence_day !== null && 
                    ` (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.recurrence_day]})`
                  }
                </Text>
              </View>
            )}
          </View>
          <View style={styles.chorePoints}>
            <Text style={styles.pointsText}>{item.points}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.choreDescription}>{item.description}</Text>
        )}

        {!isParent && isMyChore && isPending && isChoreAvailable(item) && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleMarkComplete(item.id)}
          >
            <Text style={styles.completeButtonText}>✓ Mark Complete</Text>
          </TouchableOpacity>
        )}

        {!isParent && isMyChore && isPendingApproval && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>⏳ Waiting for approval...</Text>
          </View>
        )}

        {isParent && isPendingApproval && (
          <View style={styles.approvalButtons}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item)}
            >
              <Text style={styles.approveButtonText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item.id)}
            >
              <Text style={styles.rejectButtonText}>✗ Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {isParent && !isCompleted && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteChore(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const sections = organizeChoresToSections();

  return (
    <View style={styles.container}>
      {!isParent && (
        <View style={styles.pointsBanner}>
          <Text style={styles.pointsBannerLabel}>Your Points</Text>
          <Text style={styles.pointsBannerValue}>🏆 {userPoints}</Text>
        </View>
      )}

      {isParent && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Chore</Text>
        </TouchableOpacity>
      )}

      <SectionList
        sections={sections}
        renderItem={renderChore}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadChores} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>
              {isParent ? 'No chores yet' : 'All done!'}
            </Text>
          </View>
        }
      />

      <AddChoreModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadChores}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  pointsBanner: { backgroundColor: '#2563eb', padding: 20, alignItems: 'center' },
  pointsBannerLabel: { color: 'white', fontSize: 14, opacity: 0.9 },
  pointsBannerValue: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  addButton: { backgroundColor: '#2563eb', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  list: { padding: 16 },
  sectionHeader: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  choreCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  choreCardApproval: { backgroundColor: '#fef3c7', borderColor: '#fbbf24', borderWidth: 2 },
  choreCardGreyed: { opacity: 0.5, backgroundColor: '#f3f4f6' },
  choreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  choreInfo: { flex: 1 },
  choreTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  choreAssignee: { fontSize: 14, color: '#6b7280' },
  chorePoints: { alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  pointsText: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  pointsLabel: { fontSize: 12, color: '#2563eb' },
  choreDescription: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  recurrenceBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  recurrenceText: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
  completeButton: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  completeButtonText: { color: 'white', fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#fbbf24', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  statusText: { color: '#78350f', fontWeight: '600' },
  approvalButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveButton: { flex: 1, backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  approveButtonText: { color: 'white', fontWeight: 'bold' },
  rejectButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  rejectButtonText: { color: 'white', fontWeight: 'bold' },
  deleteButton: { marginTop: 8, alignItems: 'center', padding: 8 },
  deleteButtonText: { color: '#ef4444', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#6b7280' },
});