
import { supabase } from "@/lib/supabase";

export interface DateFilterOptions {
  filterType: 'default' | 'all_data' | 'date_range' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  month?: number;
  quarter?: number;
  year?: number;
}

export const applyDateFilter = async (
  userId: string,
  options: DateFilterOptions
): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error("User authentication required for filtering data");
    }

    // Convert default filter to year filter for backend - dynamically use current year
    const currentYear = new Date().getFullYear();
    const backendOptions = options.filterType === 'default' 
      ? { ...options, filterType: 'year' as const, year: currentYear }
      : options;

    const { data, error } = await supabase.rpc('apply_date_filter_to_tasks', {
      p_user_id: userId, // Security: explicitly pass user_id
      p_filter_type: backendOptions.filterType,
      p_start_date: backendOptions.startDate || null,
      p_end_date: backendOptions.endDate || null,
      p_month: backendOptions.month || null,
      p_quarter: backendOptions.quarter || null,
      p_year: backendOptions.year || null
    });

    if (error) {
      console.error('Error applying date filter:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Exception in applyDateFilter:', error);
    throw error;
  }
};

export const refreshHeatmapSummary = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) {
      throw new Error("User authentication required for refreshing heatmap");
    }

    const { data, error } = await supabase.rpc('refresh_dynamic_heatmap_summary', {
      p_user_id: userId // Security: explicitly pass user_id
    });

    if (error) {
      console.error('Error refreshing heatmap summary:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Exception in refreshHeatmapSummary:', error);
    throw error;
  }
};

export const getFilteredHeatmapData = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error("User authentication required");
    }

    const { data, error } = await supabase
      .from('dynamic_heatmap_summary')
      .select('*')
      .eq('user_id', userId) // Security: only fetch user's own data
      .order('day_of_week')
      .order('time_block');

    if (error) {
      console.error('Error fetching filtered heatmap data:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getFilteredHeatmapData:', err);
    throw err;
  }
};
