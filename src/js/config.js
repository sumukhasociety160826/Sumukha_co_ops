/**
 * Sumukha Co-Op Society - Cloud Database Configuration
 * Integrates Supabase PostgreSQL Free Tier with Real-Time Sync
 */

import { createClient } from '@supabase/supabase-js';

// Default keys can be loaded from localStorage or environment variables
const STORAGE_CONFIG_KEY = 'sumukha_cloud_config';

export function getCloudConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  const defaultUrl = 'https://jnkewddkhqjdvlxwjfqb.supabase.co';
  const defaultKey = 'sb_publishable_Jr6Mc3E6RYnMDlQfInoBeg_CCzLqEKl';

  return {
    supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || defaultUrl,
    supabaseAnonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || defaultKey,
    isConnected: true
  };
}

export function saveCloudConfig(url, anonKey) {
  const config = {
    supabaseUrl: url.trim(),
    supabaseAnonKey: anonKey.trim(),
    isConnected: Boolean(url && anonKey)
  };
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  return config;
}

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const config = getCloudConfig();

  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
      return supabaseClient;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return null;
}
