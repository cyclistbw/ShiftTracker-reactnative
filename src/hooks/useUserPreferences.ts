
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserPreferences {
  id?: string;
  user_id: string;
  content_mode_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Module-level dedupe — same reasoning as useBusinessSettings.
let prefsCachedPromise: Promise<UserPreferences | null> | null = null;
let prefsCachedUserId: string | null = null;

function invalidatePrefsCache() {
  prefsCachedPromise = null;
  prefsCachedUserId = null;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrefsForUser = async (userId: string): Promise<UserPreferences | null> => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading preferences:', error);
      return null;
    }

    if (data) {
      return { ...data, content_mode_enabled: (data as any).content_mode_enabled || false };
    }

    // Create defaults if missing
    const defaultPrefs = { user_id: userId, content_mode_enabled: false };
    const { data: newData, error: insertError } = await supabase
      .from('user_preferences')
      .insert(defaultPrefs)
      .select()
      .single();
    if (insertError) {
      console.error('Error creating preferences:', insertError);
      return null;
    }
    return newData;
  };

  const loadPreferences = async () => {
    if (!user) { setLoading(false); return; }

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      console.warn("useUserPreferences safety timeout — forcing loading=false");
      setLoading(false);
    }, 6000);

    try {
      if (!prefsCachedPromise || prefsCachedUserId !== user.id) {
        prefsCachedUserId = user.id;
        prefsCachedPromise = fetchPrefsForUser(user.id);
      }
      const result = await prefsCachedPromise;
      if (result) setPreferences(result);
    } catch (error) {
      console.error('Error in loadPreferences:', error);
      invalidatePrefsCache();
    } finally {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      setLoading(false);
    }
  };

  // Update content mode status
  const updateContentMode = async (enabled: boolean) => {
    if (!user || !preferences) return false;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ content_mode_enabled: enabled } as any)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating content mode:', error);
        return false;
      }

      setPreferences(prev => prev ? { ...prev, content_mode_enabled: enabled } : null);
      return true;
    } catch (error) {
      console.error('Error in updateContentMode:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!user) {
      invalidatePrefsCache();
      setLoading(false);
      return;
    }
    loadPreferences();
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [user]);

  return {
    preferences,
    loading,
    updateContentMode,
    refreshPreferences: loadPreferences
  };
};
