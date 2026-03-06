// 🚩 FLAG: Calendar (react-day-picker) → DateTimePicker or custom date input (no browser calendar in RN)
// 🚩 FLAG: Popover → inline expandable section (calendar shown inline when dateRange selected)
// 🚩 FLAG: DateRange from react-day-picker → defined inline
// 🚩 FLAG: window.open → Linking.openURL
// 🚩 FLAG: <div>/<span>/<button> → <View>/<Text>/<Pressable>
import { View, Text, Pressable } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react-native";
import { format } from "date-fns";
import { useSubscription } from "@/context/SubscriptionContext";

export type DateRange = { from?: Date; to?: Date };
type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "year" | "dateRange";

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

  const periodLabels: Record<string, string> = {
    all: "All Time",
    week: "This Week",
    prevWeek: "Previous Week",
    month: "This Month",
    prevMonth: "Previous Month",
    ytd: "Year to Date",
    year: "Last 12 Months",
    dateRange: "Date Range",
  };

  const getTimeRangeInfo = () => {
    if (maxHistoryDays === -1) return null;
    if (maxHistoryDays === 7) return "Last 7 days";
    if (maxHistoryDays === 30) return "Last 30 days";
    if (maxHistoryDays === 90) return "Last 90 days";
    return `Last ${maxHistoryDays} days`;
  };

  const dateRangeLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, y")}`
      : format(dateRange.from, "LLL dd, y")
    : "Pick a date range";

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
                <SelectItem value="year">Last 12 Months</SelectItem>
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

          {/* 🚩 FLAG: Calendar (react-day-picker) not available in RN.
              Showing current selection as text. A full DateTimePicker
              implementation requires @react-native-community/datetimepicker
              and would be wired up in a follow-up pass. */}
          <View className="border border-input rounded-md px-3 py-2 bg-background">
            <Text className="text-sm text-muted-foreground">{dateRangeLabel}</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              (Date range picker — wire up @react-native-community/datetimepicker)
            </Text>
          </View>

          {isLimitedAccess && (
            <Text className="text-xs text-muted-foreground">
              Your {subscriptionTier} plan allows access to {getTimeRangeInfo()}.{" "}
              <Text className="text-primary">Upgrade for unlimited history</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default TimePeriodSelector;
