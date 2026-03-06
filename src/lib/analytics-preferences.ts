
import { supabase } from "@/lib/supabase";

export interface AnalyticsFilterState {
  filterType: 'default' | 'all_data' | 'date_range' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  month: number | null;
  quarter: number | null;
  year: number | null;
  years: number[];
}

export const saveFilterPreference = async (
  userId: string,
  componentName: string,
  filterState: AnalyticsFilterState
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId) {
      return { success: false, error: "User authentication required to save preferences" };
    }

    const { error } = await supabase
      .from('user_analytics_preferences')
      .upsert({
        user_id: userId,
        component_name: componentName,
        filter_state: filterState as any
      });

    if (error) {
      console.error('Error saving filter preference:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception saving filter preference:', err);
    return { success: false, error: 'Failed to save preference' };
  }
};

export const loadFilterPreference = async (
  userId: string,
  componentName: string
): Promise<{ data: AnalyticsFilterState | null; error?: string }> => {
  try {
    if (!userId) {
      return { data: null, error: "User authentication required to load preferences" };
    }

    const { data, error } = await supabase
      .from('user_analytics_preferences')
      .select('filter_state')
      .eq('user_id', userId)
      .eq('component_name', componentName)
      .maybeSingle();

    if (error) {
      console.error('Error loading filter preference:', error);
      return { data: null, error: error.message };
    }

    return { data: data?.filter_state as unknown as AnalyticsFilterState || null };
  } catch (err) {
    console.error('Exception loading filter preference:', err);
    return { data: null, error: 'Failed to load preference' };
  }
};

export const deleteFilterPreference = async (
  userId: string,
  componentName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId) {
      return { success: false, error: "User authentication required to delete preferences" };
    }

    const { error } = await supabase
      .from('user_analytics_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('component_name', componentName);

    if (error) {
      console.error('Error deleting filter preference:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception deleting filter preference:', err);
    return { success: false, error: 'Failed to delete preference' };
  }
};
