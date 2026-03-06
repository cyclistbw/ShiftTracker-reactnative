
// This hook is deprecated as the old static heatmap system has been removed
// The Recommendations component now uses dynamic heatmap data directly from Supabase

import { useState } from 'react';

export interface HeatmapDataItem {
  id?: string;
  day_of_week: string;
  time_slot: string;
  value: string;
  background_color: string;
  unique_work_days: number;
  hourly_rate?: number;
}

export const useHeatmapData = () => {
  console.warn("useHeatmapData hook is deprecated. The old static heatmap system has been removed.");

  return {
    heatmapData: [] as HeatmapDataItem[],
    loading: false,
    error: "This hook is deprecated - old heatmap system removed",
    refreshing: false,
    refreshData: async () => false,
    fetchHeatmapData: async () => {}
  };
};
