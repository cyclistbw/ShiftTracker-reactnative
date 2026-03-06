// 🚩 FLAG: <div>/<span> → <View>/<Text>; grid → flex-row flex-wrap
// 🚩 FLAG: lucide-react → lucide-react-native
import React from "react";
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Calendar, TrendingUp } from "lucide-react-native";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";
import { useContentMode } from "@/context/ContentModeContext";

interface IncomeAnalyticsProps {
  averages: {
    daily: { income: number; hours: number; miles: number };
    weekly: { income: number; hours: number; miles: number };
    yearly: { income: number; hours: number; miles: number };
    weeksWorked?: number;
  };
  calendarDayIncomes: Map<string, number>;
  dayTotals: Map<string, number>;
  avgDaysPerWeekAll: number;
}

const IncomeAnalytics: React.FC<IncomeAnalyticsProps> = ({
  averages,
  calendarDayIncomes,
  dayTotals,
  avgDaysPerWeekAll,
}) => {
  const { isContentModeEnabled } = useContentMode();
  const weeksWorked = averages.weeksWorked || 0;

  const yearToDateIncome = Array.from(calendarDayIncomes.values()).reduce(
    (sum, income) => sum + income,
    0
  );

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weeksPassedThisYear =
    Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const weeksRemainingThisYear = 52 - weeksPassedThisYear;

  const StatBox = ({
    icon,
    label,
    value,
    valueColor,
    sublines,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
    sublines: string[];
  }) => (
    <View className="p-3 border border-border rounded-lg bg-background w-[48%] mb-3">
      <View className="flex-row items-center gap-2 mb-1.5">
        {icon}
        <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      </View>
      <Text className={`text-xl font-bold ${valueColor || "text-foreground"}`}>{value}</Text>
      {sublines.map((line, i) => (
        <Text key={i} className="text-xs text-muted-foreground mt-1">
          {line}
        </Text>
      ))}
    </View>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Income Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="flex-row flex-wrap justify-between">
          <StatBox
            icon={<DollarSign size={16} color="#9ca3af" />}
            label="Average Daily Income"
            value={formatCurrencyWithContentMode(averages.daily.income, isContentModeEnabled)}
            sublines={[
              `Calculated from ${calendarDayIncomes.size || dayTotals.size || 0} working days`,
            ]}
          />
          <StatBox
            icon={<Clock size={16} color="#9ca3af" />}
            label="Average Weekly Income"
            value={formatCurrencyWithContentMode(averages.weekly.income, isContentModeEnabled)}
            sublines={[
              `Based on ${avgDaysPerWeekAll > 0 ? avgDaysPerWeekAll.toFixed(2) : "0"} days/week avg`,
              ...(weeksWorked > 0
                ? [`Based on ${weeksWorked} ${weeksWorked === 1 ? "week" : "weeks"}`]
                : []),
            ]}
          />
          <StatBox
            icon={<TrendingUp size={16} color="#9ca3af" />}
            label="Year-to-Date Income"
            value={formatCurrencyWithContentMode(yearToDateIncome, isContentModeEnabled)}
            valueColor="text-green-600"
            sublines={[`Total earnings from ${calendarDayIncomes.size} working days`]}
          />
          <StatBox
            icon={<Calendar size={16} color="#9ca3af" />}
            label="Projected Yearly Income"
            value={formatCurrencyWithContentMode(averages.yearly.income, isContentModeEnabled)}
            sublines={[
              `${weeksPassedThisYear} ${weeksPassedThisYear === 1 ? "week" : "weeks"} passed`,
              `${weeksRemainingThisYear} ${weeksRemainingThisYear === 1 ? "week" : "weeks"} left`,
            ]}
          />
        </View>
      </CardContent>
    </Card>
  );
};

export default IncomeAnalytics;
