// 🚩 FLAG: <div>/<span> → <View>/<Text>; animate-spin → ActivityIndicator
// 🚩 FLAG: lucide-react → lucide-react-native; grid → flex-row flex-wrap
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GigAnalyticsData } from "@/types/shift";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getHeatmapColor } from "@/utils/analytics-utils";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { applyDateFilter, refreshHeatmapSummary } from "@/lib/date-filter-service";

interface RecommendationsProps {
  analytics: GigAnalyticsData;
  appliedFilterState?: any;
  currentFilter?: string;
}

interface DynamicHeatmapData {
  day_of_week: string;
  time_block: string;
  total_earnings: number;
  unique_work_days: number;
  average_hourly: number;
  task_count: number;
}

const Recommendations: React.FC<RecommendationsProps> = ({ analytics }) => {
  const { user } = useAuth();
  const { subscriptionTier, getFeatureLimits } = useSubscription();
  const [heatmapData, setHeatmapData] = useState<DynamicHeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDataRangeLimit = () => {
    const limits = getFeatureLimits();
    return limits.dynamic_heatmap_days || 90;
  };

  useEffect(() => {
    const fetchDynamicHeatmapData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const dataRangeLimit = getDataRangeLimit();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dataRangeLimit);
        const cutoffDateString = cutoffDate.toISOString().split("T")[0];

        if (subscriptionTier === "pro" && dataRangeLimit < 365) {
          const { data: taskData } = await supabase
            .from("dynamic_preprocessed_filtered_tasks")
            .select("work_day")
            .eq("user_id", user.id)
            .gte("work_day", cutoffDateString)
            .limit(1);

          if (taskData && taskData.length === 0) {
            setHeatmapData([]);
            return;
          }

          await applyDateFilter(user.id, {
            filterType: "date_range",
            startDate: cutoffDateString,
            endDate: new Date().toISOString().split("T")[0],
          });
          await refreshHeatmapSummary(user.id);
        }

        const { data, error: fetchError } = await supabase
          .from("dynamic_heatmap_summary")
          .select("day_of_week, time_block, total_earnings, unique_work_days, average_hourly, task_count")
          .eq("user_id", user.id)
          .order("day_of_week, time_block");

        if (fetchError) throw new Error("Failed to fetch heatmap data");

        setHeatmapData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recommendations data");
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicHeatmapData();
  }, [user, subscriptionTier]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#84cc16" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-center text-muted-foreground py-2">
            Error loading recommendations: {error}
          </Text>
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

  // Helper: render a color pill (getHeatmapColor returns Tailwind class strings - use as className)
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
    <FeatureGate
      feature="recommendations"
      title="Smart Recommendations"
      description="Get personalized recommendations on the best days, peak hours, and optimal time windows to maximize your earnings."
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recommendations (Current Filter)</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasRecommendations ? (
            <View className="items-center py-2">
              <Text className="text-muted-foreground text-center">
                No recommendations available with {MIN_TASKS_PER_DAY}+ tasks/day and $
                {MIN_HOURLY_RATE}+/hr.
              </Text>
              <Text className="text-xs text-muted-foreground mt-1 text-center">
                Best Days/Peak Hours require {MIN_TASKS_PER_DAY_AGGREGATION}+ tasks/day for data
                reliability.
              </Text>
              <Text className="text-xs text-muted-foreground mt-2 text-center">
                Complete more consistent, profitable shifts to get quality recommendations.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {bestDays.length > 0 && (
                <View className="mb-3">
                  <Text className="font-medium text-sm mb-2 text-foreground">Best Days:</Text>
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
                  <Text className="font-medium text-sm mb-2 text-foreground">Peak Hours:</Text>
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
                  <Text className="font-medium text-sm mb-2 text-foreground">Optimal Windows:</Text>
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
    </FeatureGate>
  );
};

export default Recommendations;
