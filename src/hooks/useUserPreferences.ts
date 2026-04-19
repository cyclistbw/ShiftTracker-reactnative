
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserPreferences {
  id?: string;
  user_id: string;
  content_mode_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user preferences from Supabase
  const loadPreferences = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          ...data,
          content_mode_enabled: (data as any).content_mode_enabled || false
        });
      } else {
        // Create default preferences if none exist
        const defaultPrefs = {
          user_id: user.id,
          content_mode_enabled: false
        };

        const { data: newData, error: insertError } = await supabase
          .from('user_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating preferences:', insertError);
        } else {
          setPreferences(newData);
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
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
    loadPreferences();
  }, [user]);

  return {
    preferences,
    loading,
    updateContentMode,
    refreshPreferences: loadPreferences
  };
};
