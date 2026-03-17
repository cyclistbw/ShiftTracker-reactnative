// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: useIsMobile() always true → only render mobile Tabs view (skip desktop Table view)
// 🚩 FLAG: useTheme from next-themes → Appearance.getColorScheme() from react-native
// 🚩 FLAG: <input type="file"> + file.text() → expo-document-picker + FileSystem.readAsStringAsync
// 🚩 FLAG: <div>/<span> → <View>/<Text>
// 🚩 FLAG: animate-spin Loader2 → <ActivityIndicator>
import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Upload } from "lucide-react-native";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { getHeatmapColor } from "@/utils/analytics-utils";
import { useTheme } from "@/context/ThemeContext";
import DateFilterControls, { DateFilterState } from "./DateFilterControls";
import { applyDateFilter, refreshHeatmapSummary } from "@/lib/date-filter-service";
import { saveFilterPreference, loadFilterPreference, AnalyticsFilterState } from "@/lib/analytics-preferences";
// 🚩 FLAG: expo-document-picker + expo-file-system replace <input type="file"> + file.text()
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

interface HeatmapData {
  day_of_week: string;
  time_block: string;
  total_earnings: number;
  unique_work_days: number;
  average_hourly: number;
  task_count: number;
}

const TIME_SLOTS = [
  "00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00",
  "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00",
  "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-23:59"
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface LimeDynamicHeatmapRef {
  triggerFilterApply: () => void;
}

const LimeDynamicHeatmap = forwardRef<LimeDynamicHeatmapRef>((props, ref) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("mon");
  const [currentFilter, setCurrentFilter] = useState<string>("Year to Date");
  const [initialized, setInitialized] = useState(false);
  const [appliedFilterState, setAppliedFilterState] = useState<DateFilterState>({
    filterType: 'default',
    startDate: '',
    endDate: '',
    month: null,
    quarter: null,
    year: null,
    years: []
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { isDark: isDarkMode } = useTheme();
  const { subscriptionTier, getFeatureLimits } = useSubscription();

  const getDataRangeLimit = () => {
    const limits = getFeatureLimits();
    return limits.dynamic_heatmap_days || 90;
  };

  useEffect(() => {
    if (user && !initialized) {
      console.log('LimeDynamicHeatmap: Initializing component and loading data...');
      loadDataWithoutFilter();
    }
  }, [user, initialized]);

  useImperativeHandle(ref, () => ({
    triggerFilterApply: () => {
      console.log('LimeDynamicHeatmap: Manual trigger filter apply called');
      if (initialized) {
        handleFilterApply(appliedFilterState);
      } else {
        console.log('LimeDynamicHeatmap: Component not initialized yet, skipping manual trigger');
      }
    }
  }));

  const loadDataWithoutFilter = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('LimeDynamicHeatmap: Loading data with Year to Date filter already applied by Analytics page...');

      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toISOString().split('T')[0];
      const defaultFilter: DateFilterState = {
        filterType: 'date_range',
        startDate: `${currentYear}-01-01`,
        endDate: currentDate,
        month: null,
        quarter: null,
        year: null,
        years: []
      };

      await loadHeatmapData(defaultFilter);

      const filterDescription = getFilterDescription(defaultFilter);
      setCurrentFilter(filterDescription);
      setAppliedFilterState(defaultFilter);
      setInitialized(true);
      console.log('LimeDynamicHeatmap: Successfully loaded with filter:', filterDescription);
    } catch (error) {
      console.error('LimeDynamicHeatmap: Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load heatmap data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilterDescription = (filter: DateFilterState): string => {
    console.log('LimeDynamicHeatmap: Getting filter description for:', filter);

    if (filter.filterType === 'default') {
      return "Year to Date";
    } else if (filter.filterType === 'all_data') {
      return "All Data";
    } else if (filter.filterType === 'date_range' && filter.startDate && filter.endDate) {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toISOString().split('T')[0];
      if (filter.startDate === `${currentYear}-01-01` && filter.endDate === currentDate) {
        return `Year to Date`;
      }
      return `${filter.startDate} to ${filter.endDate}`;
    } else if (filter.filterType === 'month' && filter.month) {
      const monthName = new Date(2000, filter.month - 1, 1).toLocaleString('default', { month: 'long' });
      if (filter.years && filter.years.length > 0) {
        return `${monthName} ${filter.years.join(', ')}`;
      } else if (filter.year) {
        return `${monthName} ${filter.year}`;
      } else {
        return `${monthName} (All Years)`;
      }
    } else if (filter.filterType === 'quarter' && filter.quarter) {
      const quarterName = `Q${filter.quarter}`;
      if (filter.years && filter.years.length > 0) {
        return `${quarterName} ${filter.years.join(', ')}`;
      } else if (filter.year) {
        return `${quarterName} ${filter.year}`;
      } else {
        return `${quarterName} (All Years)`;
      }
    } else if (filter.filterType === 'year' && filter.year) {
      return `Year ${filter.year}`;
    }

    console.warn('LimeDynamicHeatmap: Unknown filter type, defaulting to Year to Date:', filter);
    return "Year to Date";
  };

  const loadHeatmapData = async (filterState?: DateFilterState) => {
    if (!user) return;

    try {
      console.log('LimeDynamicHeatmap: Loading heatmap data from dynamic_heatmap_summary...');
      console.log('LimeDynamicHeatmap: Current filter state:', filterState || appliedFilterState);

      const dataRangeLimit = getDataRangeLimit();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dataRangeLimit);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      console.log(`LimeDynamicHeatmap: Subscription limit: ${dataRangeLimit} days, cutoff date: ${cutoffDateString}`);

      const { data: summaryData, error } = await supabase
        .from('dynamic_heatmap_summary')
        .select('day_of_week, time_block, total_earnings, unique_work_days, average_hourly, task_count')
        .eq('user_id', user.id);

      if (error) {
        console.error('LimeDynamicHeatmap: Database query error:', error);
        throw error;
      }

      console.log('LimeDynamicHeatmap: Raw summary data:', summaryData);
      console.log('LimeDynamicHeatmap: Summary data count:', summaryData?.length || 0);

      if (subscriptionTier === 'pro' && dataRangeLimit < 365) {
        console.log(`LimeDynamicHeatmap: Pro user detected, applying ${dataRangeLimit}-day limit`);

        const { data: taskData, error: taskError } = await supabase
          .from('dynamic_preprocessed_filtered_tasks')
          .select('work_day')
          .eq('user_id', user.id)
          .gte('work_day', cutoffDateString)
          .limit(1);

        if (taskError) {
          console.error('LimeDynamicHeatmap: Task data query error:', taskError);
        } else if (taskData && taskData.length === 0) {
          console.log('LimeDynamicHeatmap: No data within subscription limit');
          setHeatmapData([]);
          return;
        }

        console.log('LimeDynamicHeatmap: Regenerating summary with date limit...');

        await applyDateFilter(user.id, {
          filterType: 'date_range',
          startDate: cutoffDateString,
          endDate: new Date().toISOString().split('T')[0]
        });

        await refreshHeatmapSummary(user.id);

        const { data: limitedSummaryData, error: limitedError } = await supabase
          .from('dynamic_heatmap_summary')
          .select('day_of_week, time_block, total_earnings, unique_work_days, average_hourly, task_count')
          .eq('user_id', user.id);

        if (limitedError) {
          console.error('LimeDynamicHeatmap: Limited summary query error:', limitedError);
          throw limitedError;
        }

        const formattedData: HeatmapData[] = (limitedSummaryData || []).map(item => ({
          day_of_week: item.day_of_week,
          time_block: item.time_block,
          total_earnings: item.total_earnings || 0,
          unique_work_days: item.unique_work_days || 0,
          average_hourly: item.average_hourly || 0,
          task_count: item.task_count || 0
        }));

        console.log('LimeDynamicHeatmap: Limited formatted heatmap data:', formattedData);
        console.log('LimeDynamicHeatmap: Limited data count:', formattedData.length);
        setHeatmapData(formattedData);
        setCurrentFilter(`Last ${dataRangeLimit} days (Pro plan limit)`);

      } else {
        console.log('LimeDynamicHeatmap: Elite user or unlimited access - showing all available data');
        const formattedData: HeatmapData[] = (summaryData || []).map(item => ({
          day_of_week: item.day_of_week,
          time_block: item.time_block,
          total_earnings: item.total_earnings || 0,
          unique_work_days: item.unique_work_days || 0,
          average_hourly: item.average_hourly || 0,
          task_count: item.task_count || 0
        }));

        console.log('LimeDynamicHeatmap: Formatted heatmap data:', formattedData);
        console.log('LimeDynamicHeatmap: Formatted data count:', formattedData.length);
        setHeatmapData(formattedData);
      }
    } catch (error) {
      console.error('LimeDynamicHeatmap: Error loading heatmap data:', error);
      toast({
        title: "Error",
        description: `Failed to load heatmap data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      setHeatmapData([]);
    }
  };

  const handleFilterApply = async (filter: DateFilterState) => {
    if (!user) return;

    setFilterLoading(true);
    try {
      console.log('LimeDynamicHeatmap: Applying filter:', filter);

      const saveResult = await saveFilterPreference(user.id, 'dynamic_heatmap', filter as AnalyticsFilterState);
      if (!saveResult.success) {
        console.warn('LimeDynamicHeatmap: Failed to save filter preference:', saveResult.error);
      } else {
        console.log('LimeDynamicHeatmap: Filter preference saved successfully');
      }

      let backendFilter;
      if (filter.filterType === 'default') {
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toISOString().split('T')[0];
        backendFilter = {
          filterType: 'date_range' as const,
          startDate: `${currentYear}-01-01`,
          endDate: currentDate
        };
      } else {
        backendFilter = {
          filterType: filter.filterType,
          startDate: filter.startDate || undefined,
          endDate: filter.endDate || undefined,
          month: filter.month || undefined,
          quarter: filter.quarter || undefined,
          year: filter.year || undefined
        };
      }

      console.log('LimeDynamicHeatmap: Backend filter:', backendFilter);

      await applyDateFilter(user.id, backendFilter);
      await refreshHeatmapSummary(user.id);
      await loadHeatmapData(filter);

      const filterDescription = getFilterDescription(filter);
      setCurrentFilter(filterDescription);
      setAppliedFilterState(filter);
      console.log('LimeDynamicHeatmap: Filter applied successfully, description:', filterDescription);

      toast({
        title: "Filter Applied",
        description: `Heatmap updated for: ${filterDescription}`
      });
    } catch (error) {
      console.error('LimeDynamicHeatmap: Error applying filter:', error);
      toast({
        title: "Error",
        description: "Failed to apply date filter",
        variant: "destructive"
      });
    } finally {
      setFilterLoading(false);
    }
  };

  // 🚩 FLAG: <input type="file"> onChange → expo-document-picker + FileSystem.readAsStringAsync
  const handleFileUpload = async () => {
    if (!user) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/comma-separated-values',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const fileContent = await FileSystem.readAsStringAsync(asset.uri);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('process-csv', {
        body: {
          csvData: fileContent,
          filename: asset.name
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `CSV processed successfully! ${response.data.rawTasksInserted} raw tasks processed into ${response.data.processedRecords} time block records.`
      });

      await handleFilterApply(appliedFilterState);
    } catch (error) {
      console.error('LimeDynamicHeatmap: Upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process CSV file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getCellData = (day: string, timeSlot: string) => {
    return heatmapData.find(d =>
      d.day_of_week === day && d.time_block === timeSlot
    );
  };

  const getCellBackgroundColor = (cellData: HeatmapData | undefined) => {
    if (!cellData || cellData.average_hourly === 0) {
      return getHeatmapColor(undefined, isDarkMode);
    }
    return getHeatmapColor(cellData.average_hourly, isDarkMode);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <FeatureGate
      feature="dynamic_heatmap"
      title="Dynamic Earnings Heatmap"
      description="Advanced heatmap analytics with custom time filtering, data uploads, and detailed performance insights."
    >
      {/* 🚩 FLAG: <Card> wraps <View> layout — Card/CardHeader/CardContent are native-compatible */}
      <Card style={{ borderColor: "#e5e7eb" }}>
        <CardHeader className="pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <CardTitle className="text-lg font-semibold">Dynamic Earnings Heatmap</CardTitle>
              <Text className="text-sm text-muted-foreground mt-1">
                Current Filter: {currentFilter}
              </Text>
            </View>

            {/* 🚩 FLAG: Label htmlFor + hidden Input → Button onPress calling DocumentPicker */}
            <Button
              variant="outline"
              size="icon"
              disabled={uploading}
              onPress={handleFileUpload}
            >
              {uploading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Upload size={16} color="#6b7280" />
              )}
            </Button>
          </View>

          <DateFilterControls
            onFilterApply={handleFilterApply}
            loading={filterLoading}
            initialFilterType="default"
            savedFilterState={appliedFilterState}
            showLastUpload={true}
          />
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <View className="flex-row justify-center items-center h-40">
              {/* 🚩 FLAG: animate-spin Loader2 → <ActivityIndicator> */}
              <ActivityIndicator size="large" className="text-primary" />
              <Text className="ml-2">Loading heatmap data...</Text>
            </View>
          ) : heatmapData.length === 0 ? (
            <View className="items-center p-8">
              <Text className="text-center text-muted-foreground">
                No data available for {currentFilter}. Upload a CSV file or adjust your filter settings.
              </Text>
            </View>
          ) : (
            // 🚩 FLAG: isMobile always true → only render mobile Tabs view; desktop Table view removed
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="mon" className="mt-2">
              <TabsList className="w-full mb-3 rounded-lg">
                {DAYS.map((day) => (
                  <TabsTrigger key={day} value={day.toLowerCase()} className="text-xs">
                    {day}
                  </TabsTrigger>
                ))}
              </TabsList>
              {DAYS.map((day) => (
                <TabsContent key={day} value={day.toLowerCase()} className="mt-2">
                  <View className="space-y-3">
                    <Text className="font-medium text-center">{day}</Text>
                    <View className="gap-2">
                      {TIME_SLOTS.map(timeSlot => {
                        const cellData = getCellData(day, timeSlot);
                        const backgroundColor = getCellBackgroundColor(cellData);

                        return (
                          // 🚩 FLAG: <div className={`... ${backgroundColor}`}> → <View className={...}>
                          <View
                            key={`${day}-${timeSlot}`}
                            className={`flex-row justify-between items-center border border-black/20 px-4 py-2.5 rounded-md ${backgroundColor}`}
                          >
                            <Text className="text-xs font-medium">{timeSlot}</Text>
                            {cellData && cellData.average_hourly > 0 && (
                              <View className="items-end">
                                <Text className="text-sm font-semibold">
                                  {formatCurrency(cellData.average_hourly)}/hr
                                </Text>
                                <Text className="text-xs opacity-80">
                                  {cellData.unique_work_days} day{cellData.unique_work_days !== 1 ? 's' : ''}
                                </Text>
                                <Text className="text-xs opacity-80">
                                  {cellData.task_count} task{cellData.task_count !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {heatmapData.length > 0 && (
            <Text className="text-xs text-center text-muted-foreground mt-3">
              Average hourly earnings for {currentFilter} • {heatmapData.length} data points loaded • {heatmapData.reduce((total, item) => total + item.task_count, 0)} total tasks
            </Text>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
});

LimeDynamicHeatmap.displayName = 'LimeDynamicHeatmap';

export default LimeDynamicHeatmap;
