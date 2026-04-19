import { useState } from "react";
import { View, Text, Pressable, Platform, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Calendar } from "lucide-react-native";
import { format } from "date-fns";
import { useSubscription } from "@/context/SubscriptionContext";

export type DateRange = { from?: Date; to?: Date };
type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "prevYear" | "year" | "dateRange";

interface TimePeriodSelectorProps {
  timePeriod: TimePeriod;
  dateRange: DateRange | undefined;
  displayedShiftsCount: number;
  maxHistoryDays: number;
  onTimePeriodChange: (value: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const TimePeriodSelector = ({
  timePeriod,
  dateRange,
  displayedShiftsCount,
  maxHistoryDays,
  onTimePeriodChange,
  onDateRangeChange,
}: TimePeriodSelectorProps) => {
  const { subscriptionTier } = useSubscription();
  const isLimitedAccess = maxHistoryDays !== -1;

  // "from" | "to" | null — which picker is open
  const [pickerMode, setPickerMode] = useState<"from" | "to" | null>(null);
  // iOS needs a staging value since the spinner fires onChange on every scroll
  const [iosStagedDate, setIosStagedDate] = useState<Date>(new Date());

  const periodLabels: Record<string, string> = {
    all: "All Time",
    week: "This Week",
    prevWeek: "Previous Week",
    month: "This Month",
    prevMonth: "Previous Month",
    ytd: "Year to Date",
    prevYear: "Previous Year",
    dateRange: "Date Range",
  };

  const getTimeRangeInfo = () => {
    if (maxHistoryDays === -1) return null;
    if (maxHistoryDays === 7) return "Last 7 days";
    if (maxHistoryDays === 30) return "Last 30 days";
    if (maxHistoryDays === 90) return "Last 90 days";
    return `Last ${maxHistoryDays} days`;
  };

  const openPicker = (mode: "from" | "to") => {
    const initial =
      mode === "from"
        ? (dateRange?.from ?? new Date())
        : (dateRange?.to ?? dateRange?.from ?? new Date());
    setIosStagedDate(initial);
    setPickerMode(mode);
  };

  const confirmIosPicker = () => {
    if (pickerMode === "from") {
      onDateRangeChange({ from: iosStagedDate, to: dateRange?.to });
    } else {
      onDateRangeChange({ from: dateRange?.from, to: iosStagedDate });
    }
    setPickerMode(null);
  };

  const handleAndroidChange = (_: any, selected?: Date) => {
    setPickerMode(null);
    if (!selected) return;
    if (pickerMode === "from") {
      onDateRangeChange({ from: selected, to: dateRange?.to });
    } else {
      onDateRangeChange({ from: dateRange?.from, to: selected });
    }
  };

  return (
    <View className="flex-col gap-4 mb-6">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-muted-foreground">
            Showing {displayedShiftsCount} unique shifts
          </Text>
          {isLimitedAccess && (
            <Badge variant="secondary">
              {getTimeRangeInfo()}
            </Badge>
          )}
        </View>

        <Select value={timePeriod} onValueChange={onTimePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" displayValue={periodLabels[timePeriod]} />
          </SelectTrigger>
          <SelectContent>
            {maxHistoryDays === -1 && <SelectItem value="all">All Time</SelectItem>}
            {maxHistoryDays !== 7 && (
              <>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="prevWeek">Previous Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="prevMonth">Previous Month</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="prevYear">Previous Year</SelectItem>
              </>
            )}
            {maxHistoryDays === 7 && (
              <>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="prevWeek">Previous Week</SelectItem>
              </>
            )}
            <SelectItem value="dateRange">Date Range</SelectItem>
            {isLimitedAccess && (
              <SelectItem value="upgrade" disabled>
                <View className="flex-row items-center gap-2">
                  <Crown size={12} color="#9ca3af" />
                  <Text>Upgrade for more history</Text>
                </View>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </View>

      {/* Date Range — shown inline when selected */}
      {timePeriod === "dateRange" && (
        <View className="flex-col gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium">Select Date Range:</Text>
            {isLimitedAccess && (
              <Badge variant="outline">
                Limited to {getTimeRangeInfo()}
              </Badge>
            )}
          </View>

          {/* Start / End buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => openPicker("from")}
              className="flex-1 border border-input rounded-md px-3 py-3 bg-background flex-row items-center gap-2"
            >
              <Calendar size={14} color="#6b7280" />
              <View>
                <Text className="text-xs text-muted-foreground">Start</Text>
                <Text className="text-sm text-foreground font-medium">
                  {dateRange?.from ? format(dateRange.from, "MMM dd, y") : "Select date"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openPicker("to")}
              className="flex-1 border border-input rounded-md px-3 py-3 bg-background flex-row items-center gap-2"
            >
              <Calendar size={14} color="#6b7280" />
              <View>
                <Text className="text-xs text-muted-foreground">End</Text>
                <Text className="text-sm text-foreground font-medium">
                  {dateRange?.to ? format(dateRange.to, "MMM dd, y") : "Select date"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Clear */}
          {(dateRange?.from || dateRange?.to) && (
            <Pressable onPress={() => onDateRangeChange(undefined)}>
              <Text className="text-xs text-muted-foreground underline">Clear dates</Text>
            </Pressable>
          )}

          {isLimitedAccess && (
            <Text className="text-xs text-muted-foreground">
              Your {subscriptionTier} plan allows access to {getTimeRangeInfo()}.{" "}
              <Text className="text-primary">Upgrade for unlimited history</Text>
            </Text>
          )}
        </View>
      )}

      {/* Android — native dialog, no wrapper needed */}
      {pickerMode !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={
            pickerMode === "from"
              ? (dateRange?.from ?? new Date())
              : (dateRange?.to ?? dateRange?.from ?? new Date())
          }
          mode="date"
          display="default"
          maximumDate={pickerMode === "to" ? new Date() : (dateRange?.to ?? new Date())}
          minimumDate={pickerMode === "to" ? (dateRange?.from ?? undefined) : undefined}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS — spinner inside a modal so user can confirm before applying */}
      {pickerMode !== null && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-background rounded-t-2xl pb-6">
              <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                <Pressable onPress={() => setPickerMode(null)}>
                  <Text className="text-base text-muted-foreground">Cancel</Text>
                </Pressable>
                <Text className="text-base font-semibold text-foreground">
                  {pickerMode === "from" ? "Start Date" : "End Date"}
                </Text>
                <Pressable onPress={confirmIosPicker}>
                  <Text className="text-base text-primary font-semibold">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosStagedDate}
                mode="date"
                display="spinner"
                maximumDate={pickerMode === "to" ? new Date() : (dateRange?.to ?? new Date())}
                minimumDate={pickerMode === "to" ? (dateRange?.from ?? undefined) : undefined}
                onChange={(_, selected) => { if (selected) setIosStagedDate(selected); }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default TimePeriodSelector;
