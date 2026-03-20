// 🚩 FLAG: localStorage.getItem → AsyncStorage.getItem (async)
// 🚩 FLAG: <div> → <View>; <span> → <Text>; grid grid-cols-2 → flex flex-row flex-wrap
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shift } from "@/types/shift";
import { calculateShiftSummary } from "@/lib/storage";
import {
  Clock,
  DollarSign,
  Car,
  Wallet,
  TrendingUp,
  Calculator,
  Receipt,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExpensesForShift, DatabaseExpense } from "@/lib/expense-storage";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface ShiftSummaryProps {
  shift: Shift;
}

const VEHICLES_STORAGE_KEY = "lime-tracker-vehicles";

const ShiftSummary = ({ shift }: ShiftSummaryProps) => {
  const { isContentModeEnabled } = useContentMode();
  const { settings } = useBusinessSettings();
  const mileageRate = settings?.defaultMileageRate || 0.725;
  const summary = calculateShiftSummary(shift, mileageRate);
  const [vehicleName, setVehicleName] = useState<string | null>(null);
  const [databaseExpenses, setDatabaseExpenses] = useState<DatabaseExpense[]>([]);

  useEffect(() => {
    if (!shift.vehicleId) return;
    // 🚩 FLAG: localStorage.getItem → AsyncStorage.getItem (async)
    AsyncStorage.getItem(VEHICLES_STORAGE_KEY).then((vehiclesJson) => {
      if (!vehiclesJson) return;
      try {
        const vehicles = JSON.parse(vehiclesJson);
        const vehicle = vehicles.find((v: any) => v.id === shift.vehicleId);
        if (vehicle) setVehicleName(vehicle.name);
      } catch (error) {
        console.error("Error parsing vehicles:", error);
      }
    });
  }, [shift.vehicleId]);

  useEffect(() => {
    if (!shift.id) return;
    getExpensesForShift(shift.id).then((result) => {
      if (result.success && result.expenses) {
        setDatabaseExpenses(result.expenses);
      }
    });
  }, [shift.id]);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatCurrency = (amount: number) =>
    formatCurrencyWithContentMode(amount, isContentModeEnabled);

  const databaseExpenseTotal = databaseExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount),
    0
  );
  const totalExpenses = summary.mileDeduction + databaseExpenseTotal;
  const grossIncome = shift.income || 0;
  const netIncome = grossIncome - totalExpenses;
  const hourlyAverage =
    summary.totalHours > 0 ? grossIncome / summary.totalHours : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Current Shift Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="flex-row flex-wrap">
          <StatItem
            icon={<Clock size={16} color="#6b7280" />}
            label="Duration"
            value={formatDuration(summary.totalHours)}
          />
          <StatItem
            icon={<Car size={16} color="#6b7280" />}
            label="Mileage"
            value={
              summary.totalMileage > 0
                ? `${(Math.round(summary.totalMileage * 100) / 100).toFixed(2)} mi${vehicleName ? ` (${vehicleName})` : ""}`
                : "Not set"
            }
          />
          <StatItem
            icon={<DollarSign size={16} color="#6b7280" />}
            label="Gross Income"
            value={formatCurrency(grossIncome)}
          />
          <StatItem
            icon={<Receipt size={16} color="#6b7280" />}
            label="Total Expenses"
            value={formatCurrency(totalExpenses)}
          />
          <StatItem
            icon={<Wallet size={16} color="#6b7280" />}
            label="Net Income"
            value={formatCurrency(netIncome)}
            valueClassName="text-lime-700"
          />
          <StatItem
            icon={<TrendingUp size={16} color="#6b7280" />}
            label="Hourly Average"
            value={`${formatCurrency(hourlyAverage)}/hr`}
          />
          {shift.tasksCompleted && shift.tasksCompleted > 0 && (
            <StatItem
              icon={<Calculator size={16} color="#6b7280" />}
              label="Earnings per Task"
              value={`${formatCurrency(grossIncome / shift.tasksCompleted)}/task`}
              fullWidth
            />
          )}
        </View>
      </CardContent>
    </Card>
  );
};

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  fullWidth?: boolean;
}

function StatItem({ icon, label, value, valueClassName, fullWidth }: StatItemProps) {
  return (
    <View className={`flex-col mb-4 ${fullWidth ? "w-full" : "w-1/2 pr-4"}`}>
      <View className="flex-row items-center mb-0.5">
        {icon}
        <Text className="text-sm text-muted-foreground ml-1">{label}</Text>
      </View>
      <Text className={`text-lg font-medium ${valueClassName ?? "text-foreground"}`}>
        {value}
      </Text>
    </View>
  );
}

export default ShiftSummary;
