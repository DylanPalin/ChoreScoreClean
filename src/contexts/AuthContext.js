// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    console.log('Loading profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, families(*)')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

const signUp = async (email, password, name, role) => {
  console.log('SignUp attempt:', { email, name, role });
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log('Auth signup response:', { authData, authError });

  if (authError) throw authError;

  // If there's no user, it means email confirmation is required
  if (!authData.user) {
    console.log('No user returned - email confirmation required');
    return authData;
  }

  console.log('Attempting to create profile for user:', authData.user.id);

  // Create profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: authData.user.id,
        email,
        name,
        role,
        avatar: role === 'parent' ? '👨' : '👧',
      },
    ])
    .select();

  console.log('Profile insert response:', { profileData, profileError });

  if (profileError) {
    console.error('Profile creation failed:', profileError);
    throw profileError;
  }

  return authData;
};

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

const signOut = async () => {
  console.log('Signing out...');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    console.log('Sign out successful');
  } catch (err) {
    console.error('Sign out failed:', err);
    throw err;
  }
};

  const createFamily = async (familyName) => {
    // Create family
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert([{ name: familyName }])
      .select()
      .single();

    if (familyError) throw familyError;

    // Update user profile with family_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ family_id: familyData.id })
      .eq('id', user.id);

    if (updateError) throw updateError;

    await loadProfile(user.id);
    return familyData;
  };

  const joinFamily = async (inviteCode) => {
    // Find family by invite code
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (familyError) throw new Error('Invalid invite code');

    // Update user profile with family_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ family_id: familyData.id })
      .eq('id', user.id);

    if (updateError) throw updateError;

    await loadProfile(user.id);
    return familyData;
  };

  const updateProfile = async (updates) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    await loadProfile(user.id);
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createFamily,
    joinFamily,
    updateProfile,
    refreshProfile: () => loadProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};