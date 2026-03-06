// 🚩 FLAG: <div>/<span> → <View>/<Text>; lucide-react → lucide-react-native
import React from "react";
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Clock, Car, Calendar } from "lucide-react-native";
import { GigAnalyticsData } from "@/types/shift";
import { formatCurrencyWithContentMode, calculatePercentChange } from "@/utils/analytics-utils";
import { useContentMode } from "@/context/ContentModeContext";
import { Badge } from "@/components/ui/badge";

interface WeeklySnapshotProps {
  analytics: GigAnalyticsData;
  averages: {
    daily: { income: number; hours: number; miles: number };
    weekly: { income: number; hours: number; miles: number };
    yearly: { income: number; hours: number; miles: number };
  };
  daysLeftInWeek: number;
}

const WeeklySnapshot: React.FC<WeeklySnapshotProps> = ({ analytics, averages, daysLeftInWeek }) => {
  const { isContentModeEnabled } = useContentMode();

  const currentWeekIncome = analytics?.recentShifts?.current_week?.total_income || 0;
  const currentWeekHours = analytics?.recentShifts?.current_week?.total_hours || 0;
  const currentWeekMiles = analytics?.recentShifts?.current_week?.total_miles || 0;
  const previousWeekIncome = analytics?.recentShifts?.previous_week?.total_income || 0;

  const vsLastWeekIncomePercent =
    previousWeekIncome > 0
      ? calculatePercentChange(currentWeekIncome, previousWeekIncome)
      : currentWeekIncome > 0
      ? 100
      : 0;

  const vsAvgWeekIncomePercent =
    averages.weekly.income > 0
      ? calculatePercentChange(currentWeekIncome, averages.weekly.income)
      : currentWeekIncome > 0
      ? 100
      : 0;

  const vsAvgWeekHoursPercent =
    averages.weekly.hours > 0
      ? calculatePercentChange(currentWeekHours, averages.weekly.hours)
      : currentWeekHours > 0
      ? 100
      : 0;

  const vsAvgWeekMilesPercent =
    averages.weekly.miles > 0
      ? calculatePercentChange(currentWeekMiles, averages.weekly.miles)
      : currentWeekMiles > 0
      ? 100
      : 0;

  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    startOfWeek.setDate(now.getDate() + mondayOffset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const getDayOfWeek = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  };

  const StatPercent = ({ value }: { value: number }) => (
    <Text className={`text-xs ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </Text>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Weekly Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="space-y-3">
          {/* Current Week */}
          <View className="space-y-2 bg-muted/40 p-3 rounded-md">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <DollarSign size={16} color="#9ca3af" />
                <Text className="text-muted-foreground text-sm ml-1">Current Week</Text>
              </View>
              <Badge variant="secondary">This Week</Badge>
            </View>
            <Text className="text-lg font-medium text-foreground">{getCurrentWeekRange()}</Text>
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1">
                <DollarSign size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">
                  {formatCurrencyWithContentMode(currentWeekIncome, isContentModeEnabled)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{currentWeekHours.toFixed(1)}h</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Car size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{currentWeekMiles.toFixed(1)}mi</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1">
                <DollarSign size={12} color="#9ca3af" />
                <StatPercent value={vsAvgWeekIncomePercent} />
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={12} color="#9ca3af" />
                <StatPercent value={vsAvgWeekHoursPercent} />
              </View>
              <View className="flex-row items-center gap-1">
                <Car size={12} color="#9ca3af" />
                <StatPercent value={vsAvgWeekMilesPercent} />
              </View>
            </View>
          </View>

          {/* Average Week */}
          <View className="space-y-2 bg-muted/40 p-3 rounded-md">
            <View className="flex-row items-center">
              <DollarSign size={16} color="#9ca3af" />
              <Text className="text-muted-foreground text-sm ml-1">Average Week</Text>
            </View>
            <Text className="text-lg font-medium text-foreground">
              {formatCurrencyWithContentMode(averages.weekly.income, isContentModeEnabled)}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1">
                <Clock size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{averages.weekly.hours.toFixed(1)}h</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Car size={16} color="#9ca3af" />
                <Text className="text-sm text-foreground">{averages.weekly.miles.toFixed(1)}mi</Text>
              </View>
            </View>
          </View>

          {/* Days Left */}
          <View className="space-y-2 bg-muted/40 p-3 rounded-md border border-primary/20">
            <View className="flex-row items-center">
              <Calendar size={16} color="#9ca3af" />
              <Text className="text-muted-foreground text-sm ml-1">Days Left This Week</Text>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-bold text-primary mr-2">{daysLeftInWeek}</Text>
              <Text className="text-sm text-muted-foreground">
                {daysLeftInWeek === 1 ? "day" : "days"}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">Today is {getDayOfWeek()}</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

export default WeeklySnapshot;
