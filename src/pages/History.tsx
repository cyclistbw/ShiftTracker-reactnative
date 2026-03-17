// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: animate-pulse Loading -> ActivityIndicator
// 🚩 FLAG: <div> -> <View>
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import ShiftHistory from "@/components/ShiftHistory";
import { useAuth } from "@/context/AuthContext";
import { useShiftHistory } from "@/hooks/useShiftHistory";
import HistoryHeader from "@/components/history/HistoryHeader";
import HistoryAlerts from "@/components/history/HistoryAlerts";
import TimePeriodSelector from "@/components/history/TimePeriodSelector";
import { getDateRangeForPeriod } from "@/lib/date-range-utils";

const History = () => {
  const { user } = useAuth();
  const {
    shifts, loading, error, duplicateWarning,
    timePeriod, dateRange, setDateRange,
    handleTimePeriodChange, loadShifts, maxHistoryDays
  } = useShiftHistory();

  useFocusEffect(useCallback(() => { loadShifts(); }, []));

  const dateRangeDisplay = getDateRangeForPeriod(timePeriod, dateRange?.from, dateRange?.to);

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 48 }}>
        <HistoryHeader userEmail={user?.email} />
        <HistoryAlerts error={error} duplicateWarning={duplicateWarning} onRetry={loadShifts} />
        <TimePeriodSelector
          timePeriod={timePeriod}
          dateRange={dateRange}
          displayedShiftsCount={shifts.length}
          maxHistoryDays={maxHistoryDays}
          onTimePeriodChange={handleTimePeriodChange}
          onDateRangeChange={setDateRange}
        />
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ShiftHistory
            shifts={shifts}
            showEmptyCards={shifts.length === 0}
            dateRange={dateRangeDisplay}
            timePeriod={timePeriod}
            onRefreshShifts={loadShifts}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default History;
