// 🚩 FLAG: <div>/<span> → <View>/<Text>; grid → flex-row flex-wrap
// 🚩 FLAG: lucide-react → lucide-react-native
import React from "react";
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Car, Target } from "lucide-react-native";
import { formatCurrencyWithContentMode, calculatePercentChange } from "@/utils/analytics-utils";
import { useContentMode } from "@/context/ContentModeContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DailySnapshotProps {
  shiftStats: {
    latest: {
      income: number;
      hours: number;
      miles: number;
      date: Date | null;
    };
    previous: {
      income: number;
      hours: number;
      miles: number;
    };
    average: {
      income: number;
      hours: number;
      miles: number;
    };
  };
  earningsGoal: {
    weeklyGoal: number;
    amountNeeded: number;
    dailyTarget: number;
    currentTotal: number;
    progressPercentage: number;
  };
  daysLeftInWeek: number;
  hasCurrentWeekShifts: boolean;
}

const DailySnapshot: React.FC<DailySnapshotProps> = ({
  shiftStats,
  earningsGoal,
  daysLeftInWeek,
  hasCurrentWeekShifts,
}) => {
  const { isContentModeEnabled } = useContentMode();
  const { latest, previous, average } = shiftStats;

  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
  };

  const weekRange = getCurrentWeekRange();

  const isLatestShiftInCurrentWeek =
    latest.date &&
    latest.date >= weekRange.start &&
    latest.date <= weekRange.end;

  const hasAnyShifts =
    latest.date !== null &&
    (latest.income > 0 || latest.hours > 0 || latest.miles > 0);
  const displayLatest = hasAnyShifts ? latest : { income: 0, hours: 0, miles: 0, date: null };

  const vsAvgShiftIncomePercent =
    hasAnyShifts && isLatestShiftInCurrentWeek && average.income > 0
      ? calculatePercentChange(displayLatest.income, average.income)
      : 0;
  const vsAvgShiftHoursPercent =
    hasAnyShifts && isLatestShiftInCurrentWeek && average.hours > 0
      ? calculatePercentChange(displayLatest.hours, average.hours)
      : 0;
  const vsAvgShiftMilesPercent =
    hasAnyShifts && isLatestShiftInCurrentWeek && average.miles > 0
      ? calculatePercentChange(displayLatest.miles, average.miles)
      : 0;

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const progressPercentageValue =
    typeof earningsGoal.progressPercentage === "number"
      ? earningsGoal.progressPercentage.toFixed(0)
      : "0";

  const StatPercent = ({ value }: { value: number }) => (
    <Text className={`text-xs ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </Text>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Daily Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="space-y-3">
          {/* Latest Shift */}
          <View className="space-y-2 bg-muted/40 p-3 rounded-md">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Clock size={16} color="#9ca3af" />
                <Text className="text-muted-foreground text-sm ml-1">Latest Shift</Text>
              </View>
              <Badge variant="secondary">Last</Badge>
            </View>

            <Text className="text-lg font-medium text-foreground">
              {!hasAnyShifts ? (
                <Text className="text-orange-500">No shifts recorded yet.</Text>
              ) : !isLatestShiftInCurrentWeek ? (
                <Text className="text-orange-500">No current shifts for this week.</Text>
              ) : (
                formatDate(displayLatest.date) || "No date available"
              )}
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <DollarSign size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">
                  {formatCurrencyWithContentMode(displayLatest.income, isContentModeEnabled)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{displayLatest.hours.toFixed(1)}h</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Car size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{displayLatest.miles.toFixed(1)}mi</Text>
              </View>
            </View>

            {hasAnyShifts && isLatestShiftInCurrentWeek && (
              <View className="flex-row gap-3">
                <View className="flex-row items-center gap-1">
                  <DollarSign size={12} color="#9ca3af" />
                  <StatPercent value={vsAvgShiftIncomePercent} />
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color="#9ca3af" />
                  <StatPercent value={vsAvgShiftHoursPercent} />
                </View>
                <View className="flex-row items-center gap-1">
                  <Car size={12} color="#9ca3af" />
                  <StatPercent value={vsAvgShiftMilesPercent} />
                </View>
              </View>
            )}
          </View>

          {/* Average Shift */}
          <View className="space-y-2 bg-muted/40 p-3 rounded-md">
            <View className="flex-row items-center">
              <DollarSign size={16} color="#9ca3af" />
              <Text className="text-muted-foreground text-sm ml-1">Average Shift</Text>
            </View>
            <Text className="text-lg font-medium text-foreground">
              {formatCurrencyWithContentMode(average.income, isContentModeEnabled)}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1">
                <Clock size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{average.hours.toFixed(1)}h</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Car size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{average.miles.toFixed(1)}mi</Text>
              </View>
            </View>
          </View>

          {/* Earnings Goal */}
          <View className="space-y-3 bg-muted/40 p-3 rounded-md">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Target size={16} color="#9ca3af" />
                <Text className="text-muted-foreground text-sm ml-1">Earnings Needed</Text>
              </View>
              <Badge variant="outline">Goal</Badge>
            </View>

            <Text className="text-lg font-medium text-green-600">
              {formatCurrencyWithContentMode(earningsGoal.amountNeeded, isContentModeEnabled)}
            </Text>

            <View className="space-y-1">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">Days left:</Text>
                <Text className="text-sm font-medium text-green-600">{daysLeftInWeek}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">$/day needed:</Text>
                <Text className="text-sm font-medium text-green-600">
                  {formatCurrencyWithContentMode(earningsGoal.dailyTarget, isContentModeEnabled)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">Current total:</Text>
                <Text className="text-sm font-medium text-foreground">
                  {formatCurrencyWithContentMode(earningsGoal.currentTotal, isContentModeEnabled)}
                </Text>
              </View>
            </View>

            <View className="pt-1">
              <Progress value={earningsGoal.progressPercentage} />
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-muted-foreground">{progressPercentageValue}%</Text>
                <Text className="text-xs text-muted-foreground">
                  {formatCurrencyWithContentMode(earningsGoal.weeklyGoal, isContentModeEnabled)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

export default DailySnapshot;
