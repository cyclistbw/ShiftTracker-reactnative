// 🚩 FLAG: <div>/<span> → <View>/<Text>; animate-spin → ActivityIndicator
// 🚩 FLAG: lucide-react → lucide-react-native; grid → flex-row flex-wrap
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GigAnalyticsData } from "@/types/shift";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getHeatmapColor } from "@/utils/analytics-utils";
import { useSubscription } from "@/context/SubscriptionContext";
import { applyDateFilter, refreshHeatmapSummary } from "@/lib/date-filter-service";
import DateFilterControls, { DateFilterState } from "./DateFilterControls";
import { saveFilterPreference, loadFilterPreference, AnalyticsFilterState } from "@/lib/analytics-preferences";

interface EliteRecommendationsProps {
  analytics: GigAnalyticsData;
}

interface DynamicHeatmapData {
  day_of_week: string;
  time_block: string;
  total_earnings: number;
  unique_work_days: number;
  average_hourly: number;
  task_count: number;
}

const EliteRecommendations: React.FC<EliteRecommendationsProps> = ({ analytics }) => {
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();
  const [heatmapData, setHeatmapData] = useState<DynamicHeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilterState, setAppliedFilterState] = useState<DateFilterState>({
    filterType: "default",
    startDate: "",
    endDate: "",
    month: null,
    quarter: null,
    year: null,
    years: [],
  });
  const [filterDescription, setFilterDescription] = useState("Year to Date");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && subscriptionTier === "elite" && !initialized) {
      loadDataWithoutFilter();
    }
  }, [user, subscriptionTier, initialized]);

  const loadDataWithoutFilter = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toISOString().split("T")[0];
      const yearToDateFilter: DateFilterState = {
        filterType: "date_range",
        startDate: `${currentYear}-01-01`,
        endDate: currentDate,
        month: null,
        quarter: null,
        year: null,
        years: [],
      };

      const { data, error: fetchError } = await supabase
        .from("dynamic_heatmap_summary")
        .select("day_of_week, time_block, total_earnings, unique_work_days, average_hourly, task_count")
        .eq("user_id", user.id)
        .order("day_of_week, time_block");

      if (fetchError) throw new Error("Failed to fetch heatmap data");

      setHeatmapData(data || []);
      setFilterDescription("Year to Date");
      setAppliedFilterState(yearToDateFilter);
      setInitialized(true);
    } catch (error) {
      setError("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const getFilterDescription = (filter: DateFilterState): string => {
    if (filter.filterType === "default") return "Year to Date";
    if (filter.filterType === "all_data") return "All Data";
    if (filter.filterType === "date_range" && filter.startDate && filter.endDate) {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toISOString().split("T")[0];
      if (filter.startDate === `${currentYear}-01-01` && filter.endDate === currentDate) {
        return "Year to Date";
      }
      return `${filter.startDate} to ${filter.endDate}`;
    }
    if (filter.filterType === "month" && filter.month) {
      const monthName = new Date(2000, filter.month - 1, 1).toLocaleString("default", { month: "long" });
      if (filter.years && filter.years.length > 0) return `${monthName} ${filter.years.join(", ")}`;
      if (filter.year) return `${monthName} ${filter.year}`;
      return `${monthName} (All Years)`;
    }
    if (filter.filterType === "quarter" && filter.quarter) {
      const quarterName = `Q${filter.quarter}`;
      if (filter.years && filter.years.length > 0) return `${quarterName} ${filter.years.join(", ")}`;
      if (filter.year) return `${quarterName} ${filter.year}`;
      return `${quarterName} (All Years)`;
    }
    if (filter.filterType === "year" && filter.year) return `Year ${filter.year}`;
    return "Year to Date";
  };

  const handleFilterApply = async (filter: DateFilterState) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await saveFilterPreference(user.id, "elite_recommendations", filter as AnalyticsFilterState);

      let backendFilter: any;
      if (filter.filterType === "default") {
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toISOString().split("T")[0];
        backendFilter = { filterType: "date_range", startDate: `${currentYear}-01-01`, endDate: currentDate };
      } else {
        backendFilter = {
          filterType: filter.filterType,
          startDate: filter.startDate || undefined,
          endDate: filter.endDate || undefined,
          month: filter.month || undefined,
          quarter: filter.quarter || undefined,
          year: filter.year || undefined,
        };
      }

      await applyDateFilter(user.id, backendFilter);
      await refreshHeatmapSummary(user.id);

      const { data, error: fetchError } = await supabase
        .from("dynamic_heatmap_summary")
        .select("day_of_week, time_block, total_earnings, unique_work_days, average_hourly, task_count")
        .eq("user_id", user.id)
        .order("day_of_week, time_block");

      if (fetchError) throw new Error("Failed to fetch heatmap data");

      setHeatmapData(data || []);
      const description = getFilterDescription(filter);
      setFilterDescription(description);
      setAppliedFilterState(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply filter");
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionTier !== "elite") return null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Elite Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="items-center justify-center py-8 flex-row">
          <ActivityIndicator size="large" color="#84cc16" />
          <Text className="ml-2 text-foreground">Applying filter...</Text>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Elite Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="items-center py-2">
            <Text className="text-muted-foreground text-center">
              Error loading recommendations: {error}
            </Text>
            <Button
              onPress={() => handleFilterApply(appliedFilterState)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </View>
        </CardContent>
      </Card>
    );
  }

  const MIN_TASKS_PER_DAY = 4;
  const MIN_TASKS_PER_DAY_AGGREGATION = 15;
  const MIN_HOURLY_RATE = 18;

  const filteredHeatmapData = heatmapData.filter((cell) => {
    const tasksPerDay = cell.unique_work_days > 0 ? cell.task_count / cell.unique_work_days : 0;
    return tasksPerDay >= MIN_TASKS_PER_DAY && (cell.average_hourly || 0) >= MIN_HOURLY_RATE;
  });

  const aggregationFilteredData = heatmapData.filter((cell) => {
    const tasksPerDay = cell.unique_work_days > 0 ? cell.task_count / cell.unique_work_days : 0;
    return (
      tasksPerDay >= MIN_TASKS_PER_DAY_AGGREGATION && (cell.average_hourly || 0) >= MIN_HOURLY_RATE
    );
  });

  const filteredColumns = aggregationFilteredData.reduce((acc: any, cell) => {
    acc[cell.day_of_week] = acc[cell.day_of_week] || [];
    acc[cell.day_of_week].push(cell.average_hourly || 0);
    return acc;
  }, {});

  const bestDays = Object.entries(filteredColumns)
    .map(([day, rates]: [string, any]) => ({
      day,
      hourlyAvg: rates.reduce((a: number, b: number) => a + b, 0) / rates.length,
      totalCells: rates.length,
    }))
    .sort((a, b) => b.hourlyAvg - a.hourlyAvg)
    .slice(0, 2);

  const filteredRows = aggregationFilteredData.reduce((acc: any, cell) => {
    acc[cell.time_block] = acc[cell.time_block] || [];
    acc[cell.time_block].push({ hourlyRate: cell.average_hourly || 0, day: cell.day_of_week });
    return acc;
  }, {});

  const bestTimeSlots = Object.entries(filteredRows)
    .filter(([_, dataPoints]: [string, any]) => dataPoints.length >= 2)
    .map(([timeSlot, dataPoints]: [string, any]) => ({
      timeSlot,
      hourlyAvg: dataPoints.reduce((a: number, b: any) => a + b.hourlyRate, 0) / dataPoints.length,
      totalCells: dataPoints.length,
    }))
    .sort((a, b) => b.hourlyAvg - a.hourlyAvg)
    .slice(0, 3);

  const bestCombos = [...filteredHeatmapData]
    .filter((cell) => {
      const tasksPerDay = cell.unique_work_days > 0 ? cell.task_count / cell.unique_work_days : 0;
      return tasksPerDay >= MIN_TASKS_PER_DAY + 1;
    })
    .sort((a, b) => (b.average_hourly || 0) - (a.average_hourly || 0))
    .slice(0, 3);

  const hasRecommendations =
    bestDays.length > 0 || bestTimeSlots.length > 0 || bestCombos.length > 0;

  const RecommendationPill = ({
    label,
    sublabel,
    colorClass,
  }: {
    label: string;
    sublabel: string;
    colorClass: string;
  }) => (
    <View className={`p-2 rounded-md ${colorClass} mb-2`}>
      <Text className="text-sm font-medium">{label}</Text>
      <Text className="text-xs opacity-80">{sublabel}</Text>
    </View>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <View className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Elite Recommendations</CardTitle>
        </View>
        <View className="mt-2">
          <DateFilterControls
            onFilterApply={handleFilterApply}
            loading={loading}
            savedFilterState={appliedFilterState}
          />
        </View>
      </CardHeader>
      <CardContent>
        {!hasRecommendations ? (
          <View className="items-center py-2">
            <Text className="text-muted-foreground text-center">
              No recommendations available for {filterDescription} with {MIN_TASKS_PER_DAY}+
              tasks/day and ${MIN_HOURLY_RATE}+/hr.
            </Text>
            <Text className="text-xs text-muted-foreground mt-1 text-center">
              Best Days/Peak Hours require {MIN_TASKS_PER_DAY_AGGREGATION}+ tasks/day for data
              reliability.
            </Text>
            <Text className="text-xs text-muted-foreground mt-2 text-center">
              Try a different time period or complete more consistent, profitable shifts.
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {bestDays.length > 0 && (
              <View className="mb-3">
                <Text className="font-medium text-sm mb-2 text-foreground">
                  Best Days ({filterDescription}):
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {bestDays.map((day, index) => (
                    <View key={day.day} className="flex-1">
                      <RecommendationPill
                        colorClass={getHeatmapColor(day.hourlyAvg)}
                        label={`${index + 1}. ${day.day}`}
                        sublabel={`$${day.hourlyAvg.toFixed(2)}/hour (${day.totalCells} time slots)`}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {bestTimeSlots.length > 0 && (
              <View className="mb-3">
                <Text className="font-medium text-sm mb-2 text-foreground">
                  Peak Hours ({filterDescription}):
                </Text>
                {bestTimeSlots.map((slot, index) => (
                  <RecommendationPill
                    key={slot.timeSlot}
                    colorClass={getHeatmapColor(slot.hourlyAvg)}
                    label={`${index + 1}. ${slot.timeSlot}`}
                    sublabel={`$${slot.hourlyAvg.toFixed(2)}/hour (${slot.totalCells} days)`}
                  />
                ))}
              </View>
            )}

            {bestCombos.length > 0 && (
              <View className="mb-3">
                <Text className="font-medium text-sm mb-2 text-foreground">
                  Optimal Windows ({filterDescription}):
                </Text>
                {bestCombos.map((window, index) => {
                  const hourlyRate = window.average_hourly || 0;
                  return (
                    <RecommendationPill
                      key={`${window.day_of_week}-${window.time_block}`}
                      colorClass={getHeatmapColor(hourlyRate)}
                      label={`${index + 1}. ${window.day_of_week}, ${window.time_block}`}
                      sublabel={`$${hourlyRate.toFixed(2)}/hour (${window.unique_work_days} days, ${(window.task_count / window.unique_work_days).toFixed(1)} tasks/day)`}
                    />
                  );
                })}
              </View>
            )}

            <View className="mt-4">
              <Text className="text-primary text-sm font-bold">Suggested Actions:</Text>
              <View className="mt-2 space-y-1">
                {bestDays.length > 0 && (
                  <Text className="text-sm text-foreground">
                    • Focus on {bestDays.map((d) => d.day).join(" and ")} shifts
                  </Text>
                )}
                {bestTimeSlots.length > 0 && (
                  <Text className="text-sm text-foreground">
                    • Prioritize{" "}
                    {bestTimeSlots
                      .map((s) => s.timeSlot)
                      .slice(0, 2)
                      .join(" and ")}{" "}
                    time slots
                  </Text>
                )}
                {bestCombos.length > 0 && (
                  <Text className="text-sm text-foreground">
                    • For best earnings: {bestCombos[0].day_of_week} {bestCombos[0].time_block}
                  </Text>
                )}
                <Text className="text-sm text-foreground">
                  • Continue tracking your shifts to refine these recommendations
                </Text>
              </View>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
};

export default EliteRecommendations;
