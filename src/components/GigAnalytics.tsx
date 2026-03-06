// 🚩 FLAG: <div>/<span> → <View>/<Text>; animate-spin → <ActivityIndicator>
import React, { useState, useRef } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Info } from "lucide-react-native";
import { generateAnalyticsData, saveAnalyticsToSupabase } from "@/lib/analytics-service";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useAuth } from "@/context/AuthContext";
import WeeklySnapshot from "@/components/analytics/WeeklySnapshot";
import DailySnapshot from "@/components/analytics/DailySnapshot";
import IncomeAnalytics from "@/components/analytics/IncomeAnalytics";
import LimeDynamicHeatmap from "@/components/analytics/LimeDynamicHeatmap";
import Recommendations from "@/components/analytics/Recommendations";
import EliteRecommendations from "@/components/analytics/EliteRecommendations";
import SeasonalEarningsAnalysis from "@/components/analytics/SeasonalEarningsAnalysis";
import PlatformAnalytics from "@/components/analytics/PlatformAnalytics";
import { ProFeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/context/SubscriptionContext";
import YearSelector from "@/components/analytics/YearSelector";
import { applyDateFilter, refreshHeatmapSummary } from "@/lib/date-filter-service";

interface GigAnalyticsProps {
  initialYear?: number;
}

const GigAnalytics: React.FC<GigAnalyticsProps> = ({ initialYear }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || currentYear);
  const [generating, setGenerating] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [currentFilterDescription, setCurrentFilterDescription] = useState<string>(`Year ${selectedYear}`);
  const [yearChanging, setYearChanging] = useState<boolean>(false);
  const heatmapRef = useRef<{ triggerFilterApply: () => void }>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();

  const {
    analytics,
    loading,
    error,
    shiftStats,
    averages,
    earningsGoal,
    daysLeftInWeek,
    calendarDayIncomes,
    dayTotals,
    avgDaysPerWeekAll,
    setAnalytics,
    setError,
    setLoading,
  } = useAnalyticsData();

  const handleYearChange = async (year: number) => {
    if (!user?.id || year === selectedYear) return;

    try {
      setYearChanging(true);
      setSelectedYear(year);
      setCurrentFilterDescription(`Year ${year}`);

      const isCurrentYear = year === currentYear;
      const startDate = `${year}-01-01`;
      const endDate = isCurrentYear
        ? new Date().toISOString().split("T")[0]
        : `${year}-12-31`;

      await applyDateFilter(user.id, {
        filterType: "date_range",
        startDate,
        endDate,
      });

      await refreshHeatmapSummary(user.id);

      const newAnalytics = await generateAnalyticsData({
        skipHeatmap: true,
        forceCombineData: true,
        year,
      });

      if (newAnalytics) {
        setAnalytics(newAnalytics);
        await saveAnalyticsToSupabase(newAnalytics);
      }

      setRefreshKey((prev) => prev + 1);

      toast({
        title: "Year Changed",
        description: `Now viewing analytics for ${year}`,
      });
    } catch (err) {
      console.error("Error changing year:", err);
      toast({
        title: "Error",
        description: "Failed to load data for the selected year.",
        variant: "destructive",
      });
    } finally {
      setYearChanging(false);
    }
  };

  const handleGenerateAnalytics = async () => {
    if (!user?.id) {
      setError("Authentication required. Please log in to generate analytics.");
      toast({
        title: "Authentication Required",
        description: "Please log in to generate analytics.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const isCurrentYear = selectedYear === currentYear;
      const startDate = `${selectedYear}-01-01`;
      const endDate = isCurrentYear
        ? new Date().toISOString().split("T")[0]
        : `${selectedYear}-12-31`;

      await applyDateFilter(user.id, {
        filterType: "date_range",
        startDate,
        endDate,
      });

      const newAnalytics = await generateAnalyticsData({
        skipHeatmap: true,
        forceCombineData: true,
        year: selectedYear,
      });

      if (!newAnalytics) {
        setError(`No shift data found for ${selectedYear}. Please add some shifts to generate analytics.`);
        toast({
          title: "No Data Available",
          description: `No shifts found for ${selectedYear}.`,
          variant: "warning",
        });
        return;
      }

      if (!newAnalytics.recentShifts) {
        throw new Error("Generated analytics data is incomplete");
      }

      setAnalytics(newAnalytics);
      await saveAnalyticsToSupabase(newAnalytics);

      setRefreshKey((prev) => prev + 1);

      setTimeout(() => {
        if (heatmapRef.current) {
          heatmapRef.current.triggerFilterApply();
        }
      }, 100);

      toast({
        title: "Analytics updated",
        description: `Your analytics for ${selectedYear} have been refreshed.`,
      });
    } catch (err) {
      console.error("Analytics generation error:", err);
      setError(`No shift data found for ${selectedYear}. Please add some shifts to generate analytics.`);
      toast({
        title: "No Data Available",
        description: `No shifts found for ${selectedYear}.`,
        variant: "warning",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center min-h-[400px]">
        <Text className="text-xl font-semibold mb-2 text-foreground">Authentication Required</Text>
        <Text className="text-gray-600">Please log in to view your analytics.</Text>
      </View>
    );
  }

  const hasCurrentWeekShifts =
    analytics?.currentWeekShifts && analytics.currentWeekShifts.length > 0;

  return (
    <View className="space-y-4">
      {/* Header row */}
      <View className="flex-row justify-between items-center flex-wrap gap-3">
        <View className="flex-row items-center gap-3 flex-wrap">
          <Text className="text-xl font-bold text-foreground">Gig Analytics</Text>
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            disabled={generating || yearChanging || loading}
          />
        </View>
        {/* 🚩 FLAG: animate-spin → ActivityIndicator inline */}
        <Button
          onPress={handleGenerateAnalytics}
          disabled={generating || yearChanging}
          className="flex-row items-center gap-2"
        >
          {generating || yearChanging ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white text-sm">
                {yearChanging ? "Loading Year..." : "Generating..."}
              </Text>
            </>
          ) : (
            <>
              <RefreshCw size={16} color="#ffffff" />
              <Text className="text-white text-sm">Refresh Analysis</Text>
            </>
          )}
        </Button>
      </View>

      {error && !analytics && (
        <Alert variant="warning">
          <Info size={16} color="#92400e" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <View className="items-center justify-center p-8">
          <ActivityIndicator size="large" color="#84cc16" />
          <Text className="mt-2 text-foreground">Loading analytics for {user.email}...</Text>
        </View>
      ) : analytics ? (
        <View className="space-y-4">
          <DailySnapshot
            shiftStats={shiftStats}
            earningsGoal={earningsGoal}
            daysLeftInWeek={daysLeftInWeek}
            hasCurrentWeekShifts={hasCurrentWeekShifts}
          />

          <WeeklySnapshot
            analytics={analytics}
            averages={averages}
            daysLeftInWeek={daysLeftInWeek}
          />

          <IncomeAnalytics
            averages={averages}
            calendarDayIncomes={calendarDayIncomes}
            dayTotals={dayTotals}
            avgDaysPerWeekAll={avgDaysPerWeekAll}
          />

          <PlatformAnalytics selectedYear={selectedYear} refreshKey={refreshKey} />

          <ProFeatureGate
            feature="seasonal_earnings_analysis"
            title="Seasonal Earnings Analysis"
            description="Analyze your earnings patterns by day of the week using shift summaries and dynamic heatmap data."
          >
            <SeasonalEarningsAnalysis />
          </ProFeatureGate>

          <LimeDynamicHeatmap key={`heatmap-${refreshKey}`} ref={heatmapRef} />

          {subscriptionTier !== "elite" && (
            <Recommendations analytics={analytics} key={`recommendations-${refreshKey}`} />
          )}

          <EliteRecommendations analytics={analytics} key={`elite-recommendations-${refreshKey}`} />
        </View>
      ) : null}

      {!analytics && !loading && (
        <View className="space-y-4">
          <PlatformAnalytics selectedYear={selectedYear} refreshKey={refreshKey} />
          <LimeDynamicHeatmap key={`heatmap-standalone-${refreshKey}`} ref={heatmapRef} />
        </View>
      )}
    </View>
  );
};

export default GigAnalytics;
