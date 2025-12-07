import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function EditProfileScreen({ navigation }) {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '😀');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        avatar,
      })
      .eq('id', profile.id);

    setLoading(false);

    if (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } else {
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* ✅ Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✏️ Edit Profile</Text>
      </View>

      {/* ✅ Card */}
      <View style={styles.card}>
        {/* NAME */}
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          style={styles.input}
        />

        {/* ✅ AVATAR PICKER */}
        <Text style={styles.label}>Avatar</Text>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setShowEmojiPicker(true)}
        >
          <Text style={styles.avatarEmoji}>{avatar}</Text>
          <Text style={styles.avatarText}>Change Avatar</Text>
        </TouchableOpacity>

        {/* ✅ EMOJI MODAL */}
        <Modal visible={showEmojiPicker} animationType="slide">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>

            <EmojiPicker
              onEmojiClick={(emojiData) => {
                setAvatar(emojiData.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </View>
        </Modal>

        {/* ✅ Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },

  card: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },

  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f9fafb',
  },

  avatarEmoji: {
    fontSize: 28,
  },

  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },

  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalContainer: {
    flex: 1,
    paddingTop: 40,
  },

  closeButton: {
    padding: 16,
    alignItems: 'center',
  },

  closeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
