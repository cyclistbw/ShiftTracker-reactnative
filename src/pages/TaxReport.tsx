// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: animate-spin -> ActivityIndicator
// 🚩 FLAG: <div>/<h2>/<h3>/<p> -> <View>/<Text>
import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import TaxReport from "@/components/TaxReport";
import { supabase } from "@/lib/supabase";
import { Shift } from "@/types/shift";
import { getCachedShifts, invalidateShiftsCache } from "@/lib/shifts-cache";
import { useQuarterlyTaxReminder } from "@/hooks/useQuarterlyTaxReminder";
import { useAuth } from "@/context/AuthContext";
import { FeatureGate } from "@/components/FeatureGate";

const TaxReportPage = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useQuarterlyTaxReminder(shifts, true);

  useEffect(() => {
    if (user === undefined) return;
    // Fire immediately — don't gate on subscription resolution.  Tier-based
    // gating happens at the FeatureGate level for content rendering, not at
    // the data-fetch level.  Waiting on initialCheckDone added 1-3 s on every
    // mount and stalled the whole tab on fresh installs.
    loadAllShiftData();
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    // Delay the WebSocket upgrade handshake by 1 s so it doesn't occupy an
    // OkHttp connection slot at the same moment the initial data queries fire.
    const refresh = () => { invalidateShiftsCache(); loadAllShiftData(); };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subTimer = setTimeout(() => {
      channel = supabase
        .channel("tax-report-shifts-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "shift_summaries", filter: `user_id=eq.${user.id}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "shift_summaries_import", filter: `user_id=eq.${user.id}` }, refresh)
        .subscribe();
    }, 1000);
    return () => {
      clearTimeout(subTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadAllShiftData = async () => {
    if (!user?.id) { setLoading(false); return; }
    // Android safety timeout: HTTP requests can hang on first login
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      console.warn("TaxReport safety timeout — forcing loading=false");
      setLoading(false);
    }, 6000);
    try {
      setLoading(true);
      // Use the shared cache so we don't duplicate the queries that
      // useShiftHistory already fires on the History tab.
      const { regular, imported } = await getCachedShifts(user.id);
      const allShifts: Shift[] = [];
      const pushShift = (shift: any, isImported: boolean) => {
        const rawSummaryData = shift.summary_data;
        let summaryData: any = null;
        try { summaryData = typeof rawSummaryData === "string" ? JSON.parse(rawSummaryData) : rawSummaryData; } catch (_) {}
        if (summaryData && typeof summaryData === "object" && summaryData.shift) {
          allShifts.push({
            id: shift.id,
            startTime: new Date(shift.start_time || summaryData.shift.startTime),
            endTime: shift.end_time ? new Date(shift.end_time) : new Date(),
            mileageStart: summaryData.shift.mileageStart ?? 0,
            mileageEnd: summaryData.shift.mileageEnd ?? 0,
            income: shift.earnings || summaryData.shift.income || 0,
            expenses: summaryData.shift.expenses || [],
            isActive: false,
            totalPausedTime: summaryData.shift.totalPausedTime || 0,
            imported: isImported,
          });
        } else {
          allShifts.push({
            id: shift.id,
            startTime: shift.start_time ? new Date(shift.start_time) : new Date(),
            endTime: shift.end_time ? new Date(shift.end_time) : new Date(),
            mileageStart: 0,
            mileageEnd: shift.miles_driven || 0,
            income: shift.earnings || 0,
            expenses: [],
            isActive: false,
            totalPausedTime: 0,
            imported: isImported,
          });
        }
      };
      regular.forEach((s) => pushShift(s, false));
      imported.forEach((s) => pushShift(s, true));
      setShifts(allShifts);
    } catch (error) {
      console.error("Error loading shift data for tax report:", error);
    } finally {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-xl font-semibold text-foreground mb-2">Authentication Required</Text>
        <Text className="text-muted-foreground">Please log in to view your tax report.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">Loading shift data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}>
        <Text className="text-2xl font-bold text-foreground mb-6">Tax Report</Text>
        <FeatureGate
          feature="tax_tools"
          title="Tax Reporting Tools"
          description="Generate comprehensive tax reports, track deductible expenses, and export data for tax preparation."
        >
          <TaxReport shifts={shifts} />
        </FeatureGate>
      </ScrollView>
    </View>
  );
};

export default TaxReportPage;
