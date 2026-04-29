// 🚩 FLAG: <div>/<span> → <View>/<Text>; Dialog/AlertDialog → Modal-based components
// 🚩 FLAG: <img src> → <Image source={{ uri }} />; window.location.href debug logs removed
// 🚩 FLAG: saveShifts/getShifts now async (AsyncStorage); must be awaited
import { useState, useEffect, useCallback } from "react";
import { View, Text } from "react-native";
import { Shift, ShiftSummary } from "@/types/shift";
import {
  calculateShiftSummary,
  getHistorySummary,
  deleteShift,
  saveShifts,
  getShifts,
} from "@/lib/storage";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { syncShiftToSupabase, deleteShiftFromSupabase } from "@/lib/supabase-functions";
import {
  deleteExpensesForShift,
} from "@/lib/expense-storage";
import type { DatabaseExpense } from "@/lib/expense-storage";

import ShiftSummaryCard from "./shift-history/ShiftSummaryCard";
import AverageStatisticsCard from "./shift-history/AverageStatisticsCard";
import ShiftDayGroup from "./shift-history/ShiftDayGroup";
import EditShiftDialog, { ShiftFormValues } from "./shift-history/EditShiftDialog";

type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "prevYear" | "year" | "dateRange";

interface ShiftHistoryProps {
  shifts: Shift[];
  showEmptyCards?: boolean;
  dateRange?: string;
  timePeriod?: TimePeriod;
  onRefreshShifts?: () => Promise<void>;
}

interface DayShiftGroup {
  date: Date;
  shifts: Shift[];
  summary: ShiftSummary;
  expanded: boolean;
  grossIncome: number;
  netIncome: number;
  totalExpenses: number;
}

const ShiftHistory = ({
  shifts,
  showEmptyCards = false,
  dateRange,
  timePeriod,
  onRefreshShifts,
}: ShiftHistoryProps) => {
  const { settings } = useBusinessSettings();
  const mileageRate = settings?.defaultMileageRate || 0.725;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary>({
    totalHours: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalMileage: 0,
    hourlyAverage: 0,
    mileDeduction: 0,
  });
  const [groupedShifts, setGroupedShifts] = useState<DayShiftGroup[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [syncingShift, setSyncingShift] = useState<string | null>(null);
  const [savingShift, setSavingShift] = useState(false);
  const [deletingShift, setDeletingShift] = useState<string | null>(null);
  const [databaseExpenses] = useState<Record<string, DatabaseExpense[]>>({});
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const uniqueShiftsMap = new Map<string, Shift>();
    shifts.forEach((shift) => {
      uniqueShiftsMap.set(shift.id, shift);
    });
    const uniqueShifts = Array.from(uniqueShiftsMap.values());
    const completedShifts = uniqueShifts.filter((shift) => shift.endTime !== null);
    const newSummary = getHistorySummary(completedShifts, mileageRate);

    newSummary.totalExpenses = newSummary.mileDeduction;
    newSummary.netIncome = newSummary.totalIncome - newSummary.totalExpenses;
    newSummary.hourlyAverage =
      newSummary.totalHours > 0 ? newSummary.totalIncome / newSummary.totalHours : 0;

    setSummary(newSummary);
    groupShiftsByDay(completedShifts);
  }, [shifts]);

  useEffect(() => {
    if (!shiftToEdit && selectedShiftId) {
      const current = shifts.find((s) => s.id === selectedShiftId);
      if (current) {
        setShiftToEdit(current);
      }
    }
  }, [shifts, selectedShiftId]);

  const groupShiftsByDay = (shifts: Shift[]) => {
    const shiftsByDate = new Map<string, Shift[]>();
    const sortedShifts = [...shifts].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    sortedShifts.forEach((shift) => {
      const dateString = format(shift.startTime, "yyyy-MM-dd");
      if (!shiftsByDate.has(dateString)) {
        shiftsByDate.set(dateString, []);
      }
      shiftsByDate.get(dateString)!.push(shift);
    });

    const grouped: DayShiftGroup[] = [];

    shiftsByDate.forEach((dayShifts) => {
      const sortedDayShifts = [...dayShifts].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );

      const daySummary = getHistorySummary(sortedDayShifts, mileageRate);

      const dayDatabaseExpenses = sortedDayShifts.reduce((sum, shift) => {
        const shiftExpenses = databaseExpenses[shift.id] || [];
        return sum + shiftExpenses.reduce((expSum, exp) => expSum + Number(exp.amount), 0);
      }, 0);

      const grossIncome = daySummary.totalIncome;
      const totalExpenses = daySummary.mileDeduction + dayDatabaseExpenses;
      const netIncome = grossIncome - totalExpenses;
      const dayHourlyAverage =
        daySummary.totalHours > 0 ? grossIncome / daySummary.totalHours : 0;

      grouped.push({
        date: sortedDayShifts[0].startTime,
        shifts: sortedDayShifts,
        summary: {
          ...daySummary,
          totalExpenses,
          netIncome,
          hourlyAverage: dayHourlyAverage,
        },
        expanded: false,
        grossIncome,
        netIncome,
        totalExpenses,
      });
    });

    setGroupedShifts(grouped);
  };

  const handleDeleteClick = (shiftId: string) => {
    setShiftToDelete(shiftId);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (shift: Shift) => {
    setShiftToEdit(shift);
    setSelectedShiftId(shift.id);
    setEditDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!shiftToDelete) return;
    setDeletingShift(shiftToDelete);

    try {
      const expenseDeleteResult = await deleteExpensesForShift(shiftToDelete);

      if (!expenseDeleteResult.success) {
        toast({
          title: "Expense deletion failed",
          description: `Couldn't delete expenses: ${expenseDeleteResult.error}`,
          variant: "destructive",
        });
        return;
      }

      if (
        shiftToDelete.startsWith("supabase-") ||
        shiftToDelete.startsWith("import-")
      ) {
        const deleteResult = await deleteShiftFromSupabase(shiftToDelete);
        if (!deleteResult.success) {
          toast({
            title: "Database deletion failed",
            description: `Couldn't delete from database: ${deleteResult.error}`,
            variant: "destructive",
          });
          return;
        }
      } else {
        await deleteShiftFromSupabase(shiftToDelete);
      }

      // 🚩 FLAG: deleteShift now async (AsyncStorage)
      await deleteShift(shiftToDelete);

      setDeleteDialogOpen(false);
      setShiftToDelete(null);

      toast({
        title: "Shift deleted",
        description: "The shift has been deleted successfully.",
      });

      if (onRefreshShifts) {
        await onRefreshShifts();
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast({
        title: "Error deleting shift",
        description: "An error occurred while deleting the shift.",
        variant: "destructive",
      });
    } finally {
      setDeletingShift(null);
    }
  };

  const handleSaveShift = async (values: ShiftFormValues) => {
    if (!shiftToEdit) return;
    setSavingShift(true);

    try {
      // 🚩 FLAG: getShifts() now async
      const allShifts = [...shifts];

      const updatedShifts = allShifts.map((shift) => {
        if (shift.id === shiftToEdit.id) {
          return {
            ...shift,
            mileageStart: values.mileageStart ? Number(values.mileageStart) : null,
            mileageEnd: values.mileageEnd ? Number(values.mileageEnd) : null,
            income: values.income ? Number(values.income) : null,
            tasksCompleted: values.tasksCompleted ? Number(values.tasksCompleted) : 0,
            startTime: values.startTime ? new Date(values.startTime) : shift.startTime,
            endTime: values.endTime ? new Date(values.endTime) : shift.endTime,
            platform:
              values.platforms && values.platforms.length > 0
                ? values.platforms.join(", ")
                : undefined,
          };
        }
        return shift;
      });

      // 🚩 FLAG: saveShifts() now async
      await saveShifts(updatedShifts);

      const updatedShift = updatedShifts.find((shift) => shift.id === shiftToEdit.id);

      if (updatedShift && updatedShift.endTime) {
        const syncResult = await syncShiftToSupabase(updatedShift);
        if (syncResult.success) {
          toast({
            title: "Shift updated and synced",
            description: "The shift has been updated locally and synced to the database.",
          });
        } else {
          toast({
            title: "Shift updated (sync failed)",
            description: `The shift was updated locally but couldn't sync: ${syncResult.error}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Shift updated",
          description: "The shift has been updated successfully.",
        });
      }

      setEditDialogOpen(false);
      setShiftToEdit(null);

      if (onRefreshShifts) {
        await onRefreshShifts();
      }
    } catch (error) {
      toast({
        title: "Error saving shift",
        description: "An error occurred while saving the shift.",
        variant: "destructive",
      });
    } finally {
      setSavingShift(false);
    }
  };

  const handleSyncToSupabase = async (shift: Shift) => {
    if (!shift.endTime) {
      toast({
        title: "Cannot sync active shift",
        description: "Only completed shifts can be synced to the database.",
        variant: "destructive",
      });
      return;
    }

    setSyncingShift(shift.id);
    try {
      const result = await syncShiftToSupabase(shift);
      if (result.success) {
        toast({ title: "Shift synced", description: "Successfully synced to the database." });
      } else {
        toast({
          title: "Sync failed",
          description: result.error || "An error occurred while syncing the shift.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync error",
        description: "An unexpected error occurred while syncing the shift.",
        variant: "destructive",
      });
    } finally {
      setSyncingShift(null);
    }
  };

  const toggleDayExpansion = useCallback((dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);

  const emptySummary: ShiftSummary = {
    totalHours: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalMileage: 0,
    hourlyAverage: 0,
    mileDeduction: 0,
  };

  const displaySummary = shifts.length === 0 ? emptySummary : summary;

  return (
    <View className="gap-6">
      <ShiftSummaryCard
        summary={displaySummary}
        dateRange={dateRange}
        timePeriod={timePeriod}
        shifts={shifts}
      />

      <AverageStatisticsCard summary={displaySummary} shifts={shifts} />

      {shifts.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-gray-500">No completed shifts yet</Text>
        </View>
      ) : (
        <View className="gap-4">
          <Text className="font-medium text-lg text-foreground">Shift History</Text>
          {groupedShifts.map((dayGroup) => {
            const dateKey = format(dayGroup.date, "yyyy-MM-dd");
            return <ShiftDayGroup
              key={dateKey}
              dayGroup={dayGroup}
              expanded={expandedDays.has(dateKey)}
              onToggleExpansion={() => toggleDayExpansion(dateKey)}
              databaseExpenses={databaseExpenses}
              onEditShift={handleEditClick}
              onDeleteShift={handleDeleteClick}
              onSyncShift={handleSyncToSupabase}
              onEditExpense={() => {}}
              onDeleteExpense={() => {}}
              onViewReceipt={() => {}}
              onAddExpense={() => {}}
              syncingShift={syncingShift}
              deletingShift={deletingShift}
              deletingExpense={null}
            />;
          })}
        </View>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onPress={handleConfirmDelete}
              disabled={!!deletingShift}
              className="bg-red-500"
            >
              {deletingShift ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit shift dialog */}
      <EditShiftDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        shift={shiftToEdit}
        onSave={handleSaveShift}
        saving={savingShift}
      />
    </View>
  );
};

export default ShiftHistory;
