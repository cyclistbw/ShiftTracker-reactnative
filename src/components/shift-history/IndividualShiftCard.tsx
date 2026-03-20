// 🚩 FLAG: <div>/<span> → <View>/<Text>; onClick → onPress
// 🚩 FLAG: grid → flex-row flex-wrap
import { View, Text } from "react-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, PenLine, Trash2, Receipt, Plus } from "lucide-react-native";
import { format } from "date-fns";
import { Shift } from "@/types/shift";
import { DatabaseExpense } from "@/lib/expense-storage";
import { calculateShiftSummary } from "@/lib/storage";
import { getReceiptImageUrl } from "@/lib/expense-storage";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface IndividualShiftCardProps {
  shift: Shift;
  databaseExpenses: DatabaseExpense[];
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

const IndividualShiftCard = ({
  shift,
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
}: IndividualShiftCardProps) => {
  const { isContentModeEnabled } = useContentMode();
  const { settings } = useBusinessSettings();
  const mileageRate = settings?.defaultMileageRate || 0.725;

  const formatCurrency = (amount: number) =>
    formatCurrencyWithContentMode(amount, isContentModeEnabled);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getShiftSourceBadge = (shiftId: string) => {
    if (shiftId.startsWith("import-"))
      return <Badge variant="outline" className="ml-2 bg-blue-50"><Text className="text-xs text-blue-700">Imported</Text></Badge>;
    if (shiftId.startsWith("supabase-"))
      return <Badge variant="outline" className="ml-2 bg-green-50"><Text className="text-xs text-green-700">Tracked</Text></Badge>;
    return null;
  };

  const summary = calculateShiftSummary(shift, mileageRate);
  const shiftMileage = (shift.mileageEnd || 0) - (shift.mileageStart || 0);
  const incomePerMile = shiftMileage > 0 ? (shift.income || 0) / shiftMileage : 0;
  const mileageDeduction = summary.mileDeduction;
  const totalShiftExpenses = mileageDeduction + databaseExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const shiftHourlyRate = summary.totalHours > 0 ? (shift.income || 0) / summary.totalHours : 0;
  const tasksPerHour =
    shift.tasksCompleted && summary.totalHours > 0
      ? shift.tasksCompleted / summary.totalHours
      : 0;

  const handleViewReceipt = async (imagePath: string) => {
    const result = await getReceiptImageUrl(imagePath);
    if (result.success && result.url) onViewReceipt(result.url);
  };

  return (
    <View className="bg-card p-3 rounded-md border mb-2">
      {/* Header row */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center flex-wrap gap-1 flex-1">
          <Text className="text-sm font-medium text-foreground">
            {format(shift.startTime, "HH:mm")}
            {shift.endTime ? ` - ${format(shift.endTime, "HH:mm")}` : ""}
          </Text>
          {getShiftSourceBadge(shift.id)}
          {shift.platform && (
            <Badge variant="secondary" className="bg-purple-50">
              <Text className="text-xs text-purple-700">{shift.platform}</Text>
            </Badge>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          {shift.endTime && !shift.id.startsWith("supabase-") && !shift.id.startsWith("import-") && (
            <Button variant="ghost" size="icon" className="h-6 w-6"
              onPress={() => onSyncShift(shift)}
              disabled={syncingShift === shift.id}
            >
              <Upload size={12} color="#16a34a" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onPress={() => onEditShift(shift)}
          >
            <PenLine size={12} color="#2563eb" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onPress={() => onAddExpense(shift)}
          >
            <Plus size={12} color="#7c3aed" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onPress={() => onDeleteShift(shift.id)}
            disabled={deletingShift === shift.id}
          >
            <Trash2 size={12} color="#dc2626" />
          </Button>
        </View>
      </View>

      {/* Stats grid */}
      <View className="flex-row flex-wrap">
        <StatRow label="Duration" value={formatDuration(summary.totalHours)} />
        <StatRow label="Mileage" value={`${(Math.round(summary.totalMileage * 100) / 100).toFixed(2)} mi`} />
        <StatRow label="Gross Income" value={formatCurrency(shift.income || 0)} />
        <StatRow label="Total Expenses" value={formatCurrency(totalShiftExpenses)} sub={`Mile: ${formatCurrency(mileageDeduction)}`} />
        <StatRow label="Net Income" value={formatCurrency((shift.income || 0) - totalShiftExpenses)} valueColor="text-lime-700" />
        <StatRow label="Hourly" value={`${formatCurrency(shiftHourlyRate)}/hr`} />
        {shiftMileage > 0 && (
          <StatRow label="Income/Mile" value={`${formatCurrency(incomePerMile)}/mi`} valueColor="text-lime-700" fullWidth />
        )}
        {(shift.tasksCompleted || 0) > 0 && !shift.isMileageOnly && (
          <>
            <StatRow label="Tasks" value={String(shift.tasksCompleted)} />
            {tasksPerHour > 0 && <StatRow label="Tasks/Hour" value={`${tasksPerHour.toFixed(1)}/hr`} valueColor="text-blue-700" />}
            <StatRow label="Earnings/Task" value={formatCurrency((shift.income || 0) / shift.tasksCompleted!)} valueColor="text-green-700" />
          </>
        )}
      </View>

      {/* Expenses */}
      {databaseExpenses.length > 0 && (
        <View className="mt-2 pt-2 border-t">
          <Text className="text-xs text-muted-foreground mb-1">Expenses:</Text>
          {databaseExpenses.map((expense) => (
            <View key={expense.id} className="flex-row justify-between items-center mb-1">
              <Text className="text-xs text-foreground flex-1">{expense.description}</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-foreground">{formatCurrency(Number(expense.amount))}</Text>
                {expense.receipt_image_path && (
                  <Button variant="ghost" size="icon" className="h-4 w-4"
                    onPress={() => handleViewReceipt(expense.receipt_image_path!)}
                  >
                    <Receipt size={10} color="#16a34a" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-4 w-4" onPress={() => onEditExpense(expense)}>
                  <PenLine size={10} color="#2563eb" />
                </Button>
                <Button variant="ghost" size="icon" className="h-4 w-4"
                  onPress={() => onDeleteExpense(expense.id)}
                  disabled={deletingExpense === expense.id}
                >
                  <Trash2 size={10} color="#dc2626" />
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

function StatRow({ label, value, sub, valueColor, fullWidth }: {
  label: string; value: string; sub?: string; valueColor?: string; fullWidth?: boolean;
}) {
  return (
    <View className={`mb-1 ${fullWidth ? "w-full" : "w-1/2"}`}>
      <Text className="text-xs">
        <Text className="text-muted-foreground">{label}: </Text>
        <Text className={`font-medium ${valueColor ?? "text-foreground"}`}>{value}</Text>
      </Text>
      {sub && <Text className="text-xs text-muted-foreground">{sub}</Text>}
    </View>
  );
}

export default IndividualShiftCard;
