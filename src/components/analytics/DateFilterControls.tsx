// 🚩 FLAG: Popover + react-day-picker Calendar → TextInput date entry (no react-day-picker in RN)
//          Install @react-native-community/datetimepicker for a proper date picker
// 🚩 FLAG: <div>/<span> → <View>/<Text>; lucide-react → lucide-react-native
// 🚩 FLAG: DateRange from react-day-picker → inline type { from?: Date; to?: Date }
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, FilterIcon, Upload, CheckCircle } from "lucide-react-native";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// 🚩 FLAG: DateRange from react-day-picker → inline type
type DateRange = { from?: Date; to?: Date };

export interface DateFilterState {
  filterType: "default" | "all_data" | "date_range" | "month" | "quarter" | "year";
  startDate: string;
  endDate: string;
  month: number | null;
  quarter: number | null;
  year: number | null;
  years: number[];
}

interface LastUploadInfo {
  filename: string;
  uploadDate: string;
  rowCount: number;
}

interface DateFilterControlsProps {
  onFilterApply: (filter: DateFilterState) => void;
  loading?: boolean;
  initialFilterType?: string;
  initialYear?: number;
  savedFilterState?: DateFilterState;
  showLastUpload?: boolean;
}

const DateFilterControls: React.FC<DateFilterControlsProps> = ({
  onFilterApply,
  loading = false,
  initialFilterType = "default",
  initialYear = 2025,
  savedFilterState,
  showLastUpload = false,
}) => {
  const { user } = useAuth();
  const [filterState, setFilterState] = useState<DateFilterState>({
    filterType: "default",
    startDate: "",
    endDate: "",
    month: null,
    quarter: null,
    year: null,
    years: [],
  });

  const [lastUpload, setLastUpload] = useState<LastUploadInfo | null>(null);

  useEffect(() => {
    const fetchLastUpload = async () => {
      if (!user || !showLastUpload) return;
      try {
        const { data } = await supabase
          .from("dynamic_csv_uploads")
          .select("filename, upload_date, row_count")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setLastUpload({
            filename: data[0].filename,
            uploadDate: data[0].upload_date,
            rowCount: data[0].row_count || 0,
          });
        }
      } catch (err) {
        console.error("Exception fetching last upload:", err);
      }
    };
    fetchLastUpload();
  }, [user, showLastUpload]);

  useEffect(() => {
    if (savedFilterState) {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toISOString().split("T")[0];
      const isYearToDate =
        savedFilterState.filterType === "date_range" &&
        savedFilterState.startDate === `${currentYear}-01-01` &&
        savedFilterState.endDate === currentDate;

      setFilterState({
        ...savedFilterState,
        filterType: isYearToDate ? "default" : savedFilterState.filterType || "default",
      });
    } else {
      setFilterState((prev) => ({ ...prev, filterType: "default", year: null }));
    }
  }, [savedFilterState, initialFilterType, initialYear]);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const yearOptions = availableYears.map((year) => year.toString());

  const quarters = [
    { value: 1, label: "Q1 (Jan-Mar)" },
    { value: 2, label: "Q2 (Apr-Jun)" },
    { value: 3, label: "Q3 (Jul-Sep)" },
    { value: 4, label: "Q4 (Oct-Dec)" },
  ];

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleFilterTypeChange = (value: string) => {
    const newFilterState: DateFilterState = {
      ...filterState,
      filterType: value as DateFilterState["filterType"],
      month: null,
      quarter: null,
      years: [],
    };
    if (value === "default" || value === "all_data") {
      newFilterState.year = null;
    } else if (value === "year" && initialYear) {
      newFilterState.year = initialYear;
    } else {
      newFilterState.year = null;
    }
    setFilterState(newFilterState);
  };

  const handleYearsChange = (selectedYears: string[]) => {
    const years = selectedYears.map((year) => parseInt(year));
    setFilterState((prev) => ({ ...prev, years }));
  };

  const handleApplyFilter = () => {
    onFilterApply(filterState);
  };

  const getSelectValue = () => filterState.filterType || "default";

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex-row items-center gap-2">
          <FilterIcon size={16} color="#6b7280" />
          <Text className="text-foreground font-medium ml-1">Date Filter</Text>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Upload Info */}
        {showLastUpload && lastUpload && (
          <View className="bg-muted/50 rounded-lg p-3 border border-border">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle size={16} color="#84cc16" />
              <Label>Last Data Upload</Label>
            </View>
            <View className="space-y-1">
              <View className="flex-row items-center gap-2">
                <Upload size={12} color="#9ca3af" />
                <Text className="text-sm text-muted-foreground flex-1" numberOfLines={1}>
                  {lastUpload.filename}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted-foreground">
                  {format(new Date(lastUpload.uploadDate), "MMM dd, yyyy h:mm a")}
                </Text>
                <Text className="text-xs text-muted-foreground">{lastUpload.rowCount} tasks</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Type */}
        <View>
          <Label className="mb-1">Filter Type</Label>
          <Select value={getSelectValue()} onValueChange={handleFilterTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Year to Date</SelectItem>
              <SelectItem value="all_data">All Data</SelectItem>
              <SelectItem value="date_range">Date Range</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </View>

        {/* 🚩 FLAG: react-day-picker Calendar → text inputs for date range */}
        {filterState.filterType === "date_range" && (
          <View className="gap-2">
            <Label>Date Range (YYYY-MM-DD)</Label>
            <Text className="text-xs text-muted-foreground">
              {/* 🚩 FLAG: Wire up @react-native-community/datetimepicker for date picker */}
              Enter dates manually or integrate DateTimePicker
            </Text>
            <Input
              placeholder="Start date (YYYY-MM-DD)"
              value={filterState.startDate}
              onChangeText={(value) =>
                setFilterState((prev) => ({ ...prev, startDate: value }))
              }
            />
            <Input
              placeholder="End date (YYYY-MM-DD)"
              value={filterState.endDate}
              onChangeText={(value) =>
                setFilterState((prev) => ({ ...prev, endDate: value }))
              }
            />
          </View>
        )}

        {filterState.filterType === "month" && (
          <View className="space-y-3">
            <View>
              <Label className="mb-1">Month</Label>
              <Select
                value={filterState.month?.toString() || ""}
                onValueChange={(value) =>
                  setFilterState((prev) => ({ ...prev, month: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View>
              <Label className="mb-1">Years (Optional)</Label>
              <MultiSelect
                options={yearOptions}
                selected={filterState.years.map((year) => year.toString())}
                onChange={handleYearsChange}
                placeholder="Select years"
              />
            </View>
          </View>
        )}

        {filterState.filterType === "quarter" && (
          <View className="space-y-3">
            <View>
              <Label className="mb-1">Quarter</Label>
              <Select
                value={filterState.quarter?.toString() || ""}
                onValueChange={(value) =>
                  setFilterState((prev) => ({ ...prev, quarter: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map((quarter) => (
                    <SelectItem key={quarter.value} value={quarter.value.toString()}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View>
              <Label className="mb-1">Years (Optional)</Label>
              <MultiSelect
                options={yearOptions}
                selected={filterState.years.map((year) => year.toString())}
                onChange={handleYearsChange}
                placeholder="Select years"
              />
            </View>
          </View>
        )}

        {filterState.filterType === "year" && (
          <View>
            <Label className="mb-1">Year</Label>
            <Select
              value={filterState.year?.toString() || ""}
              onValueChange={(value) =>
                setFilterState((prev) => ({ ...prev, year: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        )}

        <Button onPress={handleApplyFilter} disabled={loading} className="w-full flex-row items-center gap-2">
          <CalendarIcon size={16} color="#ffffff" />
          <Text className="text-white text-sm">{loading ? "Applying Filter..." : "Apply Filter"}</Text>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DateFilterControls;
