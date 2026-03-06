// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: animate-spin -> ActivityIndicator
// 🚩 FLAG: <div>/<h2>/<h3>/<p> -> <View>/<Text>
import { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import TaxReport from "@/components/TaxReport";
import { supabase } from "@/lib/supabase";
import { Shift } from "@/types/shift";
import { useQuarterlyTaxReminder } from "@/hooks/useQuarterlyTaxReminder";
import { useAuth } from "@/context/AuthContext";
import { FeatureGate } from "@/components/FeatureGate";

const TaxReportPage = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useQuarterlyTaxReminder(shifts, true);

  useEffect(() => {
    if (user !== undefined) loadAllShiftData();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("tax-report-shifts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_summaries", filter: `user_id=eq.${user.id}` }, () => loadAllShiftData())
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_summaries_import", filter: `user_id=eq.${user.id}` }, () => loadAllShiftData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const loadAllShiftData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [regularShifts, importedShifts] = await Promise.all([
        supabase.from("shift_summaries").select("*").eq("user_id", user.id),
        supabase.from("shift_summaries_import").select("*").eq("user_id", user.id)
      ]);
      const allShifts: Shift[] = [];
      if (regularShifts.data) {
        for (const shift of regularShifts.data) {
          const rawSummaryData = shift.summary_data as any;
          let summaryData: any = null;
          try { summaryData = typeof rawSummaryData === "string" ? JSON.parse(rawSummaryData) : rawSummaryData; } catch (_) {}
          if (summaryData && typeof summaryData === "object" && summaryData.shift) {
            allShifts.push({ id: shift.id, startTime: new Date(shift.start_time || summaryData.shift.startTime), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: summaryData.shift.mileageStart ?? 0, mileageEnd: summaryData.shift.mileageEnd ?? 0, income: shift.earnings || summaryData.shift.income || 0, expenses: summaryData.shift.expenses || [], isActive: false, totalPausedTime: summaryData.shift.totalPausedTime || 0, imported: false });
          } else {
            allShifts.push({ id: shift.id, startTime: shift.start_time ? new Date(shift.start_time) : new Date(), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: 0, mileageEnd: shift.miles_driven || 0, income: shift.earnings || 0, expenses: [], isActive: false, totalPausedTime: 0, imported: false });
          }
        }
      }
      if (importedShifts.data) {
        for (const shift of importedShifts.data) {
          const rawSummaryData = shift.summary_data as any;
          let summaryData: any = null;
          try { summaryData = typeof rawSummaryData === "string" ? JSON.parse(rawSummaryData) : rawSummaryData; } catch (_) {}
          if (summaryData && typeof summaryData === "object" && summaryData.shift) {
            allShifts.push({ id: shift.id, startTime: new Date(shift.start_time || summaryData.shift.startTime), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: summaryData.shift.mileageStart ?? 0, mileageEnd: summaryData.shift.mileageEnd ?? 0, income: shift.earnings || summaryData.shift.income || 0, expenses: summaryData.shift.expenses || [], isActive: false, totalPausedTime: summaryData.shift.totalPausedTime || 0, imported: true });
          } else {
            allShifts.push({ id: shift.id, startTime: shift.start_time ? new Date(shift.start_time) : new Date(), endTime: shift.end_time ? new Date(shift.end_time) : new Date(), mileageStart: 0, mileageEnd: shift.miles_driven || 0, income: shift.earnings || 0, expenses: [], isActive: false, totalPausedTime: 0, imported: true });
          }
        }
      }
      setShifts(allShifts);
    } catch (error) {
      console.error("Error loading shift data for tax report:", error);
    } finally {
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
