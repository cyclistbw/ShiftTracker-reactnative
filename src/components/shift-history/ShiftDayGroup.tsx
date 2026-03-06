// 🚩 FLAG: <div>/<span> → <View>/<Text>; onClick → onPress; grid → flex-row flex-wrap
import { View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { format } from "date-fns";
import { Shift } from "@/types/shift";
import { DatabaseExpense } from "@/lib/expense-storage";
import IndividualShiftCard from "./IndividualShiftCard";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";

interface DayShiftGroup {
  date: Date;
  shifts: Shift[];
  summary: { totalHours: number; totalMileage: number; hourlyAverage: number };
  expanded: boolean;
  grossIncome: number;
  netIncome: number;
  totalExpenses: number;
}

interface ShiftDayGroupProps {
  dayGroup: DayShiftGroup;
  onToggleExpansion: () => void;
  databaseExpenses: Record<string, DatabaseExpense[]>;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onSyncShift: (shift: Shift) => void;
  onEditExpense: (expense: DatabaseExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onViewReceipt: (imagePath: string) => void;
  onAddExpense: (shift: Shift) => void;
  syncingShift: string | null;
  deletingShift: string | null;
  deletingExpense: string | null;
}

const ShiftDayGroup = ({
  dayGroup,
  onToggleExpansion,
  databaseExpenses,
  onEditShift,
  onDeleteShift,
  onSyncShift,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
  onAddExpense,
  syncingShift,
  deletingShift,
  deletingExpense,
}: ShiftDayGroupProps) => {
  const { isContentModeEnabled } = useContentMode();
  const formatCurrency = (amount: number) => formatCurrencyWithContentMode(amount, isContentModeEnabled);
  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getSourceLabel = (shiftId: string) => {
    if (shiftId.startsWith("import-")) return { label: "Imported", color: "text-blue-800", bg: "bg-blue-100" };
    if (shiftId.startsWith("supabase-")) return { label: "Tracked", color: "text-green-800", bg: "bg-green-100" };
    return null;
  };

  const shiftsWithMileage = dayGroup.shifts.filter((s) => (s.mileageEnd || 0) - (s.mileageStart || 0) > 0);
  const dayIncomePerMile = shiftsWithMileage.length > 0
    ? shiftsWithMileage.reduce((sum, s) => sum + (s.income || 0), 0) /
      shiftsWithMileage.reduce((sum, s) => sum + ((s.mileageEnd || 0) - (s.mileageStart || 0)), 0)
    : 0;

  const shiftsWithTasks = dayGroup.shifts.filter((s) => !s.isMileageOnly && (s.tasksCompleted || 0) > 0);
  const totalTasks = shiftsWithTasks.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
  const totalHoursForTasks = shiftsWithTasks.reduce((sum, s) => {
    if (!s.endTime) return sum;
    const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
    return sum + Math.max(0, dur - ((s.totalPausedTime || 0) / (1000 * 60 * 60)));
  }, 0);
  const tasksPerHour = totalHoursForTasks > 0 ? totalTasks / totalHoursForTasks : 0;

  return (
    <Card className="overflow-hidden mb-3">
      <CardHeader className="pb-2 bg-gray-50">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <CardTitle>{format(dayGroup.date, "EEE, MMM d, yyyy")}</CardTitle>
            {dayGroup.shifts.length > 1 && (
              <View className="bg-blue-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-blue-800">{dayGroup.shifts.length} shifts</Text>
              </View>
            )}
          </View>
          <Button variant="ghost" size="icon" className="h-8 w-8" onPress={onToggleExpansion}>
            {dayGroup.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </View>
      </CardHeader>

      <CardContent className="py-3">
        {/* Day summary */}
        <View className="flex-row flex-wrap">
          <StatRow label="Total Duration" value={formatDuration(dayGroup.summary.totalHours)} />
          <StatRow label="Total Mileage" value={`${(Math.round(dayGroup.summary.totalMileage * 100) / 100).toFixed(2)} miles`} />
          <StatRow label="Gross Income" value={formatCurrency(dayGroup.grossIncome)} />
          <StatRow label="Total Expenses" value={formatCurrency(dayGroup.totalExpenses)} />
          <StatRow label="Net Income" value={formatCurrency(dayGroup.netIncome)} valueColor="text-lime-700" />
          <StatRow label="Avg Hourly" value={`${formatCurrency(dayGroup.summary.hourlyAverage)}/hr`} valueColor="text-lime-700" />
          {dayIncomePerMile > 0 && (
            <StatRow label="Income/Mile" value={`${formatCurrency(dayIncomePerMile)}/mi`} valueColor="text-lime-700" />
          )}
          {totalTasks > 0 && (
            <>
              <StatRow label="Total Tasks" value={String(totalTasks)} />
              <StatRow label="Tasks/Hour" value={`${tasksPerHour.toFixed(1)}/hr`} valueColor="text-blue-700" />
              <StatRow label="Earnings/Task" value={formatCurrency(dayGroup.grossIncome / totalTasks)} valueColor="text-green-700" />
            </>
          )}
        </View>

        {/* Time period tags for multi-shift days */}
        {dayGroup.shifts.length > 1 && (
          <View className="mt-3 pt-3 border-t border-dashed border-gray-200 flex-row flex-wrap gap-1">
            {dayGroup.shifts.map((shift, i) => {
              const src = getSourceLabel(shift.id);
              return (
                <View key={`time-${i}`} className="bg-gray-100 px-2 py-1 rounded flex-row items-center gap-1">
                  <Text className="text-xs">
                    {format(shift.startTime, "HH:mm")}
                    {shift.endTime ? ` - ${format(shift.endTime, "HH:mm")}` : ""}
                  </Text>
                  {src && (
                    <View className={`${src.bg} rounded-full px-1`}>
                      <Text className={`text-xs ${src.color}`}>{src.label}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Expanded individual shifts */}
        {dayGroup.expanded && (
          <View className="mt-3 pt-3 border-t">
            {dayGroup.shifts.map((shift) => (
              <IndividualShiftCard
                key={shift.id}
                shift={shift}
                databaseExpenses={databaseExpenses[shift.id] || []}
                onEditShift={onEditShift}
                onDeleteShift={onDeleteShift}
                onSyncShift={onSyncShift}
                onEditExpense={onEditExpense}
                onDeleteExpense={onDeleteExpense}
                onViewReceipt={onViewReceipt}
                onAddExpense={onAddExpense}
                syncingShift={syncingShift}
                deletingShift={deletingShift}
                deletingExpense={deletingExpense}
              />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
};

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View className="w-1/2 mb-2">
      <Text className="text-sm">
        <Text className="text-muted-foreground">{label}: </Text>
        <Text className={`font-medium ${valueColor ?? "text-foreground"}`}>{value}</Text>
      </Text>
    </View>
  );
}

export default ShiftDayGroup;
