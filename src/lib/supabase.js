import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmhltxseynhurcwsmevp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaGx0eHNleW5odXJjd3NtZXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDk5OTMsImV4cCI6MjA4MDQ4NTk5M30.TEmqTsrD9Kyd8Ulz3vnYGeUr6H8kgXWHJJUCgSEEjl4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // ensure the anon key is always sent as a header from web/native
  global: {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  },
});