// 🚩 FLAG: <div> → <View>; <span> → <Text>; grid → flex-row flex-wrap
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Car, DollarSign, Receipt, TrendingUp, Calculator, Activity } from "lucide-react-native";
import { ShiftSummary, Shift } from "@/types/shift";
import { Separator } from "@/components/ui/separator";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";
import { useTheme } from "@/context/ThemeContext";

type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "prevYear" | "year" | "dateRange";

interface ShiftSummaryCardProps {
  summary: ShiftSummary;
  dateRange?: string;
  timePeriod?: TimePeriod;
  shifts?: Shift[];
}

const getTimePeriodLabel = (tp?: TimePeriod): string => {
  switch (tp) {
    case "week": return "This Week";
    case "prevWeek": return "Previous Week";
    case "month": return "This Month";
    case "prevMonth": return "Previous Month";
    case "ytd": return "Year to Date";
    case "prevYear": return "Previous Year";
    case "year": return "Last 12 Months";
    case "dateRange": return "Date Range";
    default: return "All Time";
  }
};

const ShiftSummaryCard = ({ summary, dateRange, timePeriod, shifts = [] }: ShiftSummaryCardProps) => {
  const { isContentModeEnabled } = useContentMode();
  const { isDark } = useTheme();
  const limeIconColor = isDark ? "#84cc16" : "#4d7c0f";
  const limeLabelColor = isDark ? "#a3e635" : "#4d7c0f";
  const limeBgColor = isDark ? "#1a2e05" : "#f7fee7";
  const limeBorderColor = isDark ? "#3f6212" : "#d9f99d";
  const formatCurrency = (amount: number) => formatCurrencyWithContentMode(amount, isContentModeEnabled);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const grossIncome = summary.totalIncome;
  const netIncome = summary.netIncome;

  const shiftsWithTasks = shifts.filter((s) => s.tasksCompleted && s.tasksCompleted > 0);
  const totalTasks = shiftsWithTasks.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
  const totalHours = shiftsWithTasks.reduce((sum, s) => {
    if (!s.endTime) return sum;
    const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
    return sum + Math.max(0, dur - ((s.totalPausedTime || 0) / (1000 * 60 * 60)));
  }, 0);
  const avgTasksPerHour = totalHours > 0 ? totalTasks / totalHours : 0;
  const avgEarningsPerTask = totalTasks > 0 ? grossIncome / totalTasks : 0;

  return (
    <Card style={{ backgroundColor: limeBgColor, borderColor: limeBorderColor }}>
      <CardHeader className="pb-2">
        <View className="flex-row justify-between items-center">
          <CardTitle>Summary ({getTimePeriodLabel(timePeriod)})</CardTitle>
          {dateRange && (
            <Text className="text-base text-foreground">{dateRange}</Text>
          )}
        </View>
      </CardHeader>
      <CardContent className="pt-4">
        <Separator className="mb-4" />
        <View className="flex-row flex-wrap">
          <StatItem icon={<Clock size={16} color={limeIconColor} />} label="Total Hours" value={formatDuration(summary.totalHours)} labelColor={limeLabelColor} />
          <StatItem icon={<Car size={16} color={limeIconColor} />} label="Total Mileage" value={`${(Math.round(summary.totalMileage * 100) / 100).toFixed(2)} miles`} labelColor={limeLabelColor} />
          <StatItem icon={<DollarSign size={16} color={limeIconColor} />} label="Gross Income" value={formatCurrency(grossIncome)} labelColor={limeLabelColor} />
          <StatItem
            icon={<Receipt size={16} color={limeIconColor} />}
            label="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
            sub={`(Mile Deduction: ${formatCurrency(summary.mileDeduction)})`}
            labelColor={limeLabelColor}
          />
          <StatItem icon={<DollarSign size={16} color={limeIconColor} />} label="Net Income" value={formatCurrency(netIncome)} labelColor={limeLabelColor} />
          <StatItem icon={<TrendingUp size={16} color={limeIconColor} />} label="Hourly Average" value={`${formatCurrency(summary.hourlyAverage)}/hr`} labelColor={limeLabelColor} />
          {totalTasks > 0 && (
            <>
              <StatItem icon={<Activity size={16} color={limeIconColor} />} label="Tasks/Hour" value={`${avgTasksPerHour.toFixed(1)}/hr`} labelColor={limeLabelColor} />
              <StatItem icon={<Calculator size={16} color={limeIconColor} />} label="Earnings/Task" value={formatCurrency(avgEarningsPerTask)} labelColor={limeLabelColor} />
            </>
          )}
        </View>
      </CardContent>
    </Card>
  );
};

function StatItem({ icon, label, value, sub, labelColor }: { icon: React.ReactNode; label: string; value: string; sub?: string; labelColor?: string }) {
  return (
    <View className="w-1/2 pr-4 mb-4 flex-col">
      <View className="flex-row items-center mb-0.5">{icon}<Text style={{ color: labelColor }} className="text-sm ml-1">{label}</Text></View>
      <Text className="text-lg font-medium text-foreground">{value}</Text>
      {sub && <Text className="text-xs text-muted-foreground">{sub}</Text>}
    </View>
  );
}

export default ShiftSummaryCard;
