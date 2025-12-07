// src/screens/FamilySetupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function FamilySetupScreen() {
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { createFamily, joinFamily, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    const confirmed = window.confirm 
      ? window.confirm('Are you sure you want to sign out?')
      : true;

    if (confirmed) {
      try {
        await signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    setLoading(true);
    try {
      const family = await createFamily(familyName);
      Alert.alert(
        'Family Created!',
        `Your invite code is: ${family.invite_code}\n\nShare this with family members so they can join.`
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      await joinFamily(inviteCode);
      Alert.alert('Success', 'You joined the family!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.logoutButtonTop} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.title}>Welcome, {profile?.name}!</Text>
          <Text style={styles.subtitle}>Let's set up your family</Text>
        </View>

        <View style={styles.buttonContainer}>
          {profile?.role === 'parent' && (
            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => setMode('create')}
            >
              <Text style={styles.modeEmoji}>➕</Text>
              <Text style={styles.modeTitle}>Create Family</Text>
              <Text style={styles.modeDescription}>
                Start a new family and get an invite code
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('join')}
          >
            <Text style={styles.modeEmoji}>🔗</Text>
            <Text style={styles.modeTitle}>Join Family</Text>
            <Text style={styles.modeDescription}>
              Enter an invite code from your parent
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setMode(null)}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.title}>Create Your Family</Text>
          <Text style={styles.subtitle}>Choose a name for your family</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Family name (e.g., The Johnsons)"
            value={familyName}
            onChangeText={setFamilyName}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateFamily}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Family'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode(null)}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>🔗</Text>
        <Text style={styles.title}>Join Your Family</Text>
        <Text style={styles.subtitle}>Enter the invite code from your parent</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="INVITE CODE"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoinFamily}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Joining...' : 'Join Family'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  backText: {
    color: '#2563eb',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  modeButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  modeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButtonTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});