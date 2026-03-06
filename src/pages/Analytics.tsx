// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: animate-spin -> ActivityIndicator
// 🚩 FLAG: <div>/<p>/<h2>/<button> -> <View>/<Text>/<Button>
// 🚩 FLAG: onClick -> onPress
import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import GigAnalytics from "@/components/GigAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { supabase } from "@/lib/supabase";
import { Shift } from "@/types/shift";
import { useQuarterlyTaxReminder } from "@/hooks/useQuarterlyTaxReminder";
import { initDatabaseProcedures } from "@/lib/supabase-procedures";
import { applyDateFilter, refreshHeatmapSummary } from "@/lib/date-filter-service";
import { Button } from "@/components/ui/button";

const Analytics = () => {
  const { user } = useAuth();
  const { analytics, loading, error, setAnalytics, setError, setLoading } = useAnalyticsData();
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  useEffect(() => {
    const applyHeatmapFilter = async () => {
      if (!user?.id) return;
      try {
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toISOString().split("T")[0];
        const yearToDateFilter = { filterType: "date_range" as const, startDate: `${currentYear}-01-01`, endDate: currentDate };
        await applyDateFilter(user.id, yearToDateFilter);
        await refreshHeatmapSummary(user.id);
      } catch (error) {
        console.error("Heatmap filter error:", error);
      }
    };
    if (user) applyHeatmapFilter();
  }, [user]);

  useEffect(() => {
    if (user) initDatabaseProcedures();
  }, [user]);

  useEffect(() => {
    const loadShiftsForTaxReminder = async () => {
      if (!user?.id) return;
      try {
        const [regularShifts, importedShifts] = await Promise.all([
          supabase.from("shift_summaries").select("*").eq("user_id", user.id),
          supabase.from("shift_summaries_import").select("*").eq("user_id", user.id)
        ]);
        const shiftsData: Shift[] = [];
        if (regularShifts.data) {
          for (const shift of regularShifts.data) {
            const summaryData = shift.summary_data as any;
            if (summaryData && typeof summaryData === "object" && summaryData.shift) {
              shiftsData.push({ id: shift.id, startTime: new Date(shift.start_time || summaryData.shift.startTime), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: summaryData.shift.mileageStart || 0, mileageEnd: summaryData.shift.mileageEnd || 0, income: shift.earnings || summaryData.shift.income || 0, expenses: summaryData.shift.expenses || [], isActive: false, totalPausedTime: summaryData.shift.totalPausedTime || 0, imported: false });
            } else {
              shiftsData.push({ id: shift.id, startTime: shift.start_time ? new Date(shift.start_time) : new Date(), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: 0, mileageEnd: shift.miles_driven || 0, income: shift.earnings || 0, expenses: [], isActive: false, totalPausedTime: 0, imported: false });
            }
          }
        }
        if (importedShifts.data) {
          for (const shift of importedShifts.data) {
            const summaryData = shift.summary_data as any;
            if (summaryData && typeof summaryData === "object" && summaryData.shift) {
              shiftsData.push({ id: shift.id, startTime: new Date(shift.start_time || summaryData.shift.startTime), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: summaryData.shift.mileageStart || 0, mileageEnd: summaryData.shift.mileageEnd || 0, income: shift.earnings || summaryData.shift.income || 0, expenses: summaryData.shift.expenses || [], isActive: false, totalPausedTime: summaryData.shift.totalPausedTime || 0, imported: true });
            } else {
              shiftsData.push({ id: shift.id, startTime: shift.start_time ? new Date(shift.start_time) : new Date(), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: 0, mileageEnd: shift.miles_driven || 0, income: shift.earnings || 0, expenses: [], isActive: false, totalPausedTime: 0, imported: true });
            }
          }
        }
        setAllShifts(shiftsData);
      } catch (error) {
        console.error("Error loading shifts for tax reminder:", error);
      }
    };
    if (user !== undefined) loadShiftsForTaxReminder();
  }, [user]);

  useQuarterlyTaxReminder(allShifts, false);

  const refreshData = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => setLoading(false), 1000);
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-xl font-semibold text-foreground mb-2">Authentication Required</Text>
        <Text className="text-muted-foreground">Please log in to view your analytics.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">Loading analytics data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-xl font-semibold text-red-600 mb-2">Error Loading Analytics</Text>
        <Text className="text-muted-foreground mb-4">{error}</Text>
        <Button onPress={refreshData}>Try Again</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <GigAnalytics />
    </View>
  );
};

export default Analytics;
