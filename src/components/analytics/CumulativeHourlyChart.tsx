import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, useWindowDimensions, Platform } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useContentMode } from "@/context/ContentModeContext";
import { useTheme } from "@/context/ThemeContext";

type WindowKey = "30d" | "90d" | "6m" | "1y";

const WINDOWS: { key: WindowKey; label: string; days: number }[] = [
  { key: "30d", label: "30 Days", days: 30 },
  { key: "90d", label: "90 Days", days: 90 },
  { key: "6m",  label: "6 Months", days: 183 },
  { key: "1y",  label: "Full Year", days: 365 },
];

interface ShiftRow {
  start_time: string;
  earnings: number | null;
  hours_worked: number | null;
}

interface DataPoint {
  value: number;
  date: string;
}

interface MonthLabel {
  label: string; // e.g. "Jan"
  index: number; // which data point index this month starts at
}

interface CumulativeHourlyChartProps {
  selectedYear: number;
  refreshKey: number;
}

const CumulativeHourlyChart: React.FC<CumulativeHourlyChartProps> = ({ selectedYear, refreshKey }) => {
  const { user } = useAuth();
  const { isContentModeEnabled } = useContentMode();
  const { isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [activeWindow, setActiveWindow] = useState<WindowKey>("1y");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [monthLabels, setMonthLabels] = useState<MonthLabel[]>([]);
  const [pointSpacing, setPointSpacing] = useState(10);
  const [currentAvg, setCurrentAvg] = useState(0);
  const [peakAvg, setPeakAvg] = useState(0);
  const [shiftCount, setShiftCount] = useState(0);
  const [dataAreaWidth, setDataAreaWidth] = useState(0);

  const Y_AXIS_WIDTH = 36;
  const effectiveWidth = Platform.OS === "web" ? Math.min(screenWidth, 768) : screenWidth;
  const chartWidth = effectiveWidth - 48 - Y_AXIS_WIDTH;

  const labelColor    = isDark ? "#9ca3af" : "#6b7280";
  const axisColor     = isDark ? "#374151" : "#e5e7eb";
  const rulesColor    = isDark ? "#1f2937" : "#f3f4f6";
  const tooltipBg     = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";
  const lineColor     = "#84cc16";

  useEffect(() => {
    if (!user?.id) return;
    fetchAndBuild();
  }, [user?.id, selectedYear, refreshKey, activeWindow]);

  const fetchAndBuild = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const now = new Date();
      const selectedWindow = WINDOWS.find((w) => w.key === activeWindow)!;

      const yearEnd = new Date(`${selectedYear}-12-31T23:59:59`);
      const effectiveEnd = selectedYear === now.getFullYear() ? now : yearEnd;
      const yearStart = new Date(`${selectedYear}-01-01T00:00:00`);

      let startDate: string;
      const endDate = effectiveEnd.toISOString();

      if (activeWindow === "1y") {
        startDate = yearStart.toISOString();
      } else {
        const from = new Date(effectiveEnd);
        from.setDate(from.getDate() - selectedWindow.days);
        const clamped = from < yearStart ? yearStart : from;
        startDate = clamped.toISOString();
      }

      const [regular, imported] = await Promise.all([
        supabase
          .from("shift_summaries")
          .select("start_time, earnings, hours_worked")
          .eq("user_id", user.id)
          .gte("start_time", startDate)
          .lte("start_time", endDate)
          .order("start_time", { ascending: true }),
        supabase
          .from("shift_summaries_import")
          .select("start_time, earnings, hours_worked")
          .eq("user_id", user.id)
          .gte("start_time", startDate)
          .lte("start_time", endDate)
          .order("start_time", { ascending: true }),
      ]);

      const all: ShiftRow[] = [
        ...(regular.data || []),
        ...(imported.data || []),
      ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      const valid = all.filter(
        (s) => s.earnings != null && s.hours_worked != null && s.hours_worked > 0
      );

      if (valid.length === 0) {
        setChartData([]);
        setMonthLabels([]);
        setCurrentAvg(0);
        setPeakAvg(0);
        setShiftCount(0);
        setLoading(false);
        return;
      }

      let sumRates = 0;
      let peak = 0;
      const points: DataPoint[] = [];
      const labels: MonthLabel[] = [];
      const seenMonths = new Set<string>();

      valid.forEach((shift, idx) => {
        const rate = shift.earnings! / shift.hours_worked!;
        sumRates += rate;
        const cumAvg = sumRates / (idx + 1);
        if (cumAvg > peak) peak = cumAvg;

        const date = new Date(shift.start_time);
        const fullDate = date.toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });

        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          labels.push({
            label: date.toLocaleDateString("en-US", { month: "short" }),
            index: idx,
          });
        }

        points.push({ value: parseFloat(cumAvg.toFixed(2)), date: fullDate });
      });

      const spacing = Math.max(4, Math.floor(chartWidth / Math.max(points.length - 1, 1)));

      setChartData(points);
      setMonthLabels(labels);
      setPointSpacing(spacing);
      setCurrentAvg(points[points.length - 1].value);
      setPeakAvg(parseFloat(peak.toFixed(2)));
      setShiftCount(valid.length);
    } catch (err) {
      console.error("CumulativeHourlyChart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    isContentModeEnabled ? "••••" : `$${n.toFixed(2)}/hr`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-row items-center gap-2">
          <TrendingUp size={20} color="#84cc16" />
          <Text className="text-foreground font-semibold ml-2">
            Cumulative Average Hourly
          </Text>
        </CardTitle>
      </CardHeader>

      <CardContent className="gap-4">
        {/* Window selector */}
        <View className="flex-row gap-2">
          {WINDOWS.map((w) => {
            const active = activeWindow === w.key;
            return (
              <Pressable
                key={w.key}
                onPress={() => setActiveWindow(w.key)}
                className={`flex-1 py-1.5 rounded-md items-center border ${
                  active ? "bg-lime-500 border-lime-500" : "bg-transparent border-border"
                }`}
              >
                <Text className={`text-xs font-medium ${active ? "text-white" : "text-muted-foreground"}`}>
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Summary stats */}
        {!loading && chartData.length > 0 && (
          <View className="flex-row gap-3">
            <View className="flex-1 bg-lime-500/10 rounded-lg p-3">
              <Text className="text-xs text-muted-foreground mb-0.5">Current Avg</Text>
              <Text className="text-base font-bold text-lime-600">{fmt(currentAvg)}</Text>
            </View>
            <View className="flex-1 bg-blue-500/10 rounded-lg p-3">
              <Text className="text-xs text-muted-foreground mb-0.5">Peak Avg</Text>
              <Text className="text-base font-bold text-blue-500">{fmt(peakAvg)}</Text>
            </View>
            <View className="flex-1 bg-muted rounded-lg p-3">
              <Text className="text-xs text-muted-foreground mb-0.5">Shifts</Text>
              <Text className="text-base font-bold text-foreground">{shiftCount}</Text>
            </View>
          </View>
        )}

        {/* Chart */}
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color="#84cc16" />
          </View>
        ) : chartData.length < 2 ? (
          <View className="items-center py-8">
            <Text className="text-sm text-muted-foreground text-center">
              {chartData.length === 0
                ? "No shift data with hourly rates found for this window."
                : "At least 2 shifts are needed to show a trend."}
            </Text>
          </View>
        ) : (
          <>
            {/* Measure the true data area width once rendered */}
            <View
              onLayout={(e) => setDataAreaWidth(e.nativeEvent.layout.width - Y_AXIS_WIDTH)}
            >
              <LineChart
                data={chartData}
                width={chartWidth}
                height={200}
                spacing={pointSpacing}
                color={lineColor}
                thickness={2}
                curved
                hideDataPoints={chartData.length > 40}
                dataPointsColor={lineColor}
                dataPointsRadius={3}
                startFillColor={lineColor}
                endFillColor={lineColor}
                startOpacity={0.25}
                endOpacity={0.01}
                areaChart
                noOfSections={4}
                yAxisLabelWidth={Y_AXIS_WIDTH}
                yAxisTextStyle={{ color: labelColor, fontSize: 9 }}
                yAxisLabelPrefix="$"
                yAxisColor="transparent"
                xAxisColor={axisColor}
                rulesColor={rulesColor}
                showXAxisIndices={false}
                hideYAxisText={isContentModeEnabled}
                isAnimated
                animationDuration={600}
                xAxisLabelsHeight={0}
                xAxisLabelTextStyle={{ color: "transparent", fontSize: 0 }}
                pointerConfig={{
                  activatePointersOnLongPress: true,
                  autoAdjustPointerLabelPosition: true,
                  pointerStripUptoDataPoint: true,
                  pointerStripColor: isDark ? "#6b7280" : "#9ca3af",
                  pointerStripWidth: 1,
                  pointerColor: lineColor,
                  radius: 6,
                  pointerLabelWidth: 130,
                  pointerLabelHeight: 60,
                  pointerLabelComponent: (items: any[]) => {
                    const item = items[0];
                    if (!item) return null;
                    return (
                      <View
                        style={{
                          width: 130,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: tooltipBg,
                          borderWidth: 1,
                          borderColor: tooltipBorder,
                          shadowColor: "#000",
                          shadowOpacity: 0.12,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text style={{ color: labelColor, fontSize: 10, marginBottom: 2 }}>
                          {item.date}
                        </Text>
                        <Text style={{ color: lineColor, fontSize: 14, fontWeight: "700" }}>
                          {isContentModeEnabled ? "••••" : `$${item.value.toFixed(2)}/hr`}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            </View>

            {/* Custom month label row using proportional flex spacers */}
            {dataAreaWidth > 0 && monthLabels.length > 0 && (
              <View style={{ flexDirection: "row", paddingLeft: Y_AXIS_WIDTH, marginTop: 4 }}>
                {monthLabels.map((ml, i) => {
                  const nextIndex =
                    i < monthLabels.length - 1
                      ? monthLabels[i + 1].index
                      : chartData.length - 1;
                  const segmentShifts = nextIndex - ml.index;
                  const segmentWidth = segmentShifts * pointSpacing;
                  return (
                    <View key={`${ml.label}-${ml.index}`} style={{ width: Math.max(segmentWidth, 24) }}>
                      <Text style={{ fontSize: 10, color: labelColor }}>{ml.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text className="text-xs text-muted-foreground">
              Hold on the chart to see the cumulative average at any point in time.
              A rising line means your overall rate is improving.
            </Text>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CumulativeHourlyChart;
