import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { SectionList } from "react-native";

export default function FamilyScreen() {
  const { profile, signOut } = useAuth();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, [profile?.family_id]);

  const loadFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("family_id", profile?.family_id)
        .order("role", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      const membersWithPoints = await Promise.all(
        (data || []).map(async (member) => {
          if (member.role === "child") {
            const { data: points, error: pointsError } = await supabase
              .from("points_history")
              .select("points_earned")
              .eq("user_id", member.id);

            if (pointsError) throw pointsError;

            const totalPoints =
              points?.reduce((sum, p) => sum + p.points_earned, 0) || 0;

            return { ...member, totalPoints };
          }
          return member;
        })
      );

      setFamilyMembers(membersWithPoints);
    } catch (error) {
      console.error("Error loading family members:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ WEB CLIPBOARD COPY
  const handleCopyInviteCode = async () => {
    try {
      if (!profile?.families?.invite_code) return;

      await navigator.clipboard.writeText(profile.families.invite_code);
      Alert.alert("Copied!", "Invite code copied to clipboard");
    } catch (error) {
      console.error("Clipboard error:", error);
      Alert.alert("Error", "Failed to copy invite code");
    }
  };

  // ✅ SIGN OUT HANDLER
  const handleSignOut = async () => {
    const confirmed = window.confirm
      ? window.confirm("Are you sure you want to sign out?")
      : await new Promise((resolve) => {
          Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            {
              text: "Sign Out",
              style: "destructive",
              onPress: () => resolve(true),
            },
          ]);
        });

    if (confirmed) {
      try {
        await signOut();
      } catch (err) {
        console.error("Sign out error:", err);
        Alert.alert("Error", "Failed to sign out");
      }
    }
  };

  const parents = familyMembers.filter((m) => m.role === "parent");
  const children = familyMembers.filter((m) => m.role === "child");

  const sections = [
    { title: "Parents", data: parents },
    { title: "Children", data: children },
  ];

  const renderMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberAvatar}>{item.avatar}</Text>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberRole}>
            {item.role === "parent" ? "👔 Parent" : "👶 Child"}
          </Text>
        </View>
      </View>

      {item.role === "child" && (
        <View style={styles.memberPoints}>
          <Text style={styles.pointsNumber}>{item.totalPoints || 0}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧‍👦 {profile?.families?.name}</Text>

        {profile?.role === "parent" && profile?.families?.invite_code && (
          <TouchableOpacity
            style={styles.inviteCodeButton}
            onPress={handleCopyInviteCode}
          >
            <Text style={styles.inviteCodeText}>
              {profile.families.invite_code} 📋
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={sections} // [{ title: "Parents", data: parents }, { title: "Children", data: children }]
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        renderSectionHeader={({ section: { title, data } }) =>
          data.length > 0 ? (
            <Text style={styles.sectionTitle}>{title}</Text>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadFamilyMembers}
          />
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 60, // for status bar
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flexShrink: 1, // allow title to shrink if button is wide
  },

  inviteCodeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  inviteCodeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },

  list: { padding: 16 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 12,
    textTransform: "uppercase",
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  memberInfo: { flexDirection: "row", alignItems: "center", flex: 1 },

  memberAvatar: { fontSize: 32, marginRight: 12 },

  memberDetails: { flex: 1 },

  memberName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },

  memberRole: { fontSize: 14, color: "#6b7280" },

  memberPoints: { alignItems: "flex-end" },

  pointsNumber: { fontSize: 24, fontWeight: "bold", color: "#2563eb" },

  pointsLabel: { fontSize: 12, color: "#6b7280" },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  signOutButton: {
    backgroundColor: "#ef4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
