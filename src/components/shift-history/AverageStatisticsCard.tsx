// 🚩 FLAG: hidden sm:block / block sm:hidden responsive → mobile-first View grid only
// 🚩 FLAG: <Table> → View grid (already using mobile layout from web)
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftSummary, Shift } from "@/types/shift";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";

interface AverageStatisticsCardProps {
  summary: ShiftSummary;
  shifts: Shift[];
}

const AverageStatisticsCard = ({ summary, shifts }: AverageStatisticsCardProps) => {
  const { isContentModeEnabled } = useContentMode();

  const formatCurrency = (amount: number) =>
    formatCurrencyWithContentMode(amount, isContentModeEnabled);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const completedShifts = shifts.filter((s) => s.endTime !== null);
  const avgDuration = completedShifts.length > 0 ? summary.totalHours / completedShifts.length : 0;
  const avgMileage = completedShifts.length > 0 ? summary.totalMileage / completedShifts.length : 0;
  const avgIncome = completedShifts.length > 0 ? summary.totalIncome / completedShifts.length : 0;

  const shiftsWithMileage = completedShifts.filter((s) => (s.mileageEnd || 0) - (s.mileageStart || 0) > 0);
  const totalIncomeWithMileage = shiftsWithMileage.reduce((sum, s) => sum + (s.income || 0), 0);
  const totalMileageWithIncome = shiftsWithMileage.reduce((sum, s) => sum + ((s.mileageEnd || 0) - (s.mileageStart || 0)), 0);
  const avgIncomePerMile = totalMileageWithIncome > 0 ? totalIncomeWithMileage / totalMileageWithIncome : 0;

  const shiftsWithTasks = completedShifts.filter((s) => s.tasksCompleted && s.tasksCompleted > 0);
  const totalTasks = shiftsWithTasks.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
  const totalHoursForTasks = shiftsWithTasks.reduce((sum, s) => {
    if (!s.endTime) return sum;
    const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
    return sum + Math.max(0, dur - ((s.totalPausedTime || 0) / (1000 * 60 * 60)));
  }, 0);
  const avgTasksPerHour = totalHoursForTasks > 0 ? totalTasks / totalHoursForTasks : 0;
  const avgEarningsPerTask = totalTasks > 0 ? summary.totalIncome / totalTasks : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Average Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="flex-row flex-wrap gap-4">
          <StatBox label="Duration (avg)" value={formatDuration(avgDuration)} />
          <StatBox label="Mileage (avg)" value={`${avgMileage.toFixed(2)} mi`} />
          <StatBox label="Income (avg)" value={formatCurrency(avgIncome)} />
          <StatBox label="Hourly Rate" value={`${formatCurrency(summary.hourlyAverage)}/hr`} />
          {avgIncomePerMile > 0 && (
            <StatBox label="Income/Mile" value={`${formatCurrency(avgIncomePerMile)}/mi`} />
          )}
          {avgTasksPerHour > 0 && (
            <StatBox label="Tasks/Hour" value={`${avgTasksPerHour.toFixed(1)}/hr`} />
          )}
          {avgEarningsPerTask > 0 && (
            <StatBox label="Earnings/Task" value={formatCurrency(avgEarningsPerTask)} />
          )}
        </View>
      </CardContent>
    </Card>
  );
};

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[45%] items-center p-3 bg-muted/50 rounded-lg border border-border/50">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      <Text className="font-medium text-foreground">{value}</Text>
    </View>
  );
}

export default AverageStatisticsCard;
