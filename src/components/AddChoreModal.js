import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext.js";
import { supabase } from "../lib/supabase";

export default function AddChoreModal({ visible, onClose, onSuccess }) {
  const { profile, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("20");
  const [assignedTo, setAssignedTo] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFamilyMembers();
    }
  }, [visible]);

  const loadFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("family_id", profile?.family_id)
        .eq("role", "child");

      if (error) throw error;
      setFamilyMembers(data || []);
      if (data && data.length > 0) {
        setAssignedTo(data[0].id);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim())
      return Alert.alert("Error", "Please enter a chore title");
    if (!assignedTo)
      return Alert.alert("Error", "Please select who to assign this to");

    const pointsNum = parseInt(points) || 0;
    if (pointsNum < 0) return Alert.alert("Error", "Points must be positive");

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chores")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            points: pointsNum,
            assigned_to: assignedTo,
            created_by: user.id,
            family_id: profile.family_id,
            status: "pending",
          },
        ])
        .select(); // <-- optional, gets the inserted chore

      if (error) throw error;

      // Reset fields
      setTitle("");
      setDescription("");
      setPoints("20");

      // Refresh list and close modal
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add New Chore</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Chore Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Do laundry"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Assign To</Text>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberOption,
                  assignedTo === member.id && styles.memberOptionSelected,
                ]}
                onPress={() => setAssignedTo(member.id)}
              >
                <Text style={styles.memberEmoji}>{member.avatar}</Text>
                <Text
                  style={[
                    styles.memberName,
                    assignedTo === member.id && styles.memberNameSelected,
                  ]}
                >
                  {member.name}
                </Text>
                {assignedTo === member.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            {familyMembers.length === 0 && (
              <Text style={styles.noMembers}>
                No children in your family yet. Add family members first!
              </Text>
            )}

            <Text style={styles.label}>Points</Text>
            <TextInput
              style={styles.input}
              placeholder="20"
              value={points}
              onChangeText={setPoints}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || familyMembers.length === 0}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Adding..." : "Add Chore"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  closeButton: { fontSize: 24, color: "#6b7280" },
  content: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  memberOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  memberOptionSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  memberEmoji: { fontSize: 24, marginRight: 12 },
  memberName: { flex: 1, fontSize: 16, color: "#374151" },
  memberNameSelected: { color: "#2563eb", fontWeight: "600" },
  checkmark: { fontSize: 20, color: "#2563eb" },
  noMembers: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    padding: 20,
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
