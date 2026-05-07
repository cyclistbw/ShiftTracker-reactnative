// 🚩 FLAG: recharts (BarChart, PieChart) → not available in RN; replaced with simple text-based data tables
//          Use react-native-gifted-charts or victory-native for native charts
// 🚩 FLAG: Collapsible/CollapsibleContent/CollapsibleTrigger (Radix) → useState-based show/hide
// 🚩 FLAG: Tooltip/TooltipProvider (Radix) → no-op (our stub returns null; tooltip text shown inline)
// 🚩 FLAG: ChartContainer/ChartTooltip/ChartTooltipContent → removed (charts not rendered)
// 🚩 FLAG: <div>/<span> → <View>/<Text>; grid → flex-row flex-wrap
import { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Shift } from "@/types/shift";
import {
  getYearlyReportData,
  getAvailableYears,
  getQuarterlyBreakdown,
  getMonthlyBreakdown,
} from "@/lib/tax-storage";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useVehicles } from "@/hooks/useVehicles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DollarSign,
  Clock,
  Car,
  FileText,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";
import { useTheme, THEME_COLORS } from "@/context/ThemeContext";

interface TaxReportProps {
  shifts: Shift[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TAX_BRACKETS = [
  { min: 0, max: 11600, rate: 0.1 },
  { min: 11601, max: 47150, rate: 0.12 },
  { min: 47151, max: 100525, rate: 0.22 },
  { min: 100526, max: 191950, rate: 0.24 },
  { min: 191951, max: 243725, rate: 0.32 },
  { min: 243726, max: 609350, rate: 0.35 },
  { min: 609351, max: Infinity, rate: 0.37 },
];

const TaxReport = ({ shifts }: TaxReportProps) => {
  const { isContentModeEnabled } = useContentMode();
  const { isDark } = useTheme();
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const limeIconColor = isDark ? "#84cc16" : "#4d7c0f";
  const limeLabelColor = isDark ? "#a3e635" : "#4d7c0f";
  const limeBgColor = isDark ? "#1a2e05" : "#f7fee7";
  const limeBorderColor = isDark ? "#3f6212" : "#d9f99d";
  const chartLabelColor = isDark ? "#94a3b8" : "#6b7280";
  const chartAxisColor = isDark ? "#334155" : "#e5e7eb";
  const chartRulesColor = isDark ? "#1e293b" : "#f3f4f6";
  const { settings } = useBusinessSettings();
  const { vehicles } = useVehicles();
  const mileageRate = settings?.defaultMileageRate || 0.725;

  const availableYears = useMemo(() => getAvailableYears(shifts), [shifts]);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] || new Date().getFullYear()
  );

  // 🚩 FLAG: Collapsible state — track open state per quarter by index
  const [openBreakdowns, setOpenBreakdowns] = useState<Record<number, boolean>>({});

  const yearlyData = useMemo(
    () => getYearlyReportData(shifts, selectedYear, mileageRate),
    [shifts, selectedYear, mileageRate]
  );
  const quarterlyData = useMemo(
    () => getQuarterlyBreakdown(shifts, selectedYear, mileageRate),
    [shifts, selectedYear, mileageRate]
  );
  const monthlyData = useMemo(
    () => getMonthlyBreakdown(shifts, selectedYear, mileageRate),
    [shifts, selectedYear, mileageRate]
  );

  const vehicleMileageBreakdown = useMemo(() => {
    // Require valid odometer-style readings: both fields present, end > start, start > 0.
    // NOTE: the old >= 100000 guard is removed so new/low-mileage vehicles are included.
    const odometerShifts = shifts.filter((shift) => {
      const shiftYear = shift.startTime.getFullYear();
      return (
        shiftYear === selectedYear &&
        shift.endTime &&
        !shift.isActive &&
        typeof shift.mileageStart === "number" &&
        typeof shift.mileageEnd === "number" &&
        (shift.mileageStart as number) > 0 &&
        (shift.mileageEnd as number) > (shift.mileageStart as number)
      );
    });

    if (odometerShifts.length === 0) {
      return {
        totalVehicleMiles: 0,
        businessMiles: 0,
        nonBusinessMiles: 0,
        businessPercentage: 0,
        nonBusinessPercentage: 0,
        vehicleCount: 0,
      };
    }

    const sorted = [...odometerShifts].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Detect vehicle changes by comparing each shift's mileageStart against the
    // previous shift's mileageEnd. A strongly negative gap means the odometer
    // reset (new/different vehicle). A gap > 50 000 mi between consecutive shifts
    // is also treated as a new vehicle (implausible same-car jump).
    const VEHICLE_CHANGE_THRESHOLD = 10000;

    const segments: (typeof sorted)[] = [];
    let currentSegment: typeof sorted = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentSegment[currentSegment.length - 1];
      const curr = sorted[i];
      const gap = (curr.mileageStart as number) - (prev.mileageEnd as number);

      if (gap < -VEHICLE_CHANGE_THRESHOLD || gap > 50000) {
        segments.push(currentSegment);
        currentSegment = [curr];
      } else {
        currentSegment.push(curr);
      }
    }
    segments.push(currentSegment);

    // Total vehicle miles = sum of (last mileageEnd − first mileageStart) per vehicle segment.
    // This correctly handles multiple vehicles: each vehicle's span is counted independently.
    let totalVehicleMiles = 0;
    for (const seg of segments) {
      const first = seg[0].mileageStart as number;
      const last = seg[seg.length - 1].mileageEnd as number;
      totalVehicleMiles += Math.max(0, last - first);
    }

    const businessMiles = sorted.reduce(
      (sum, s) => sum + ((s.mileageEnd as number) - (s.mileageStart as number)),
      0
    );

    const nonBusinessMiles = Math.max(0, totalVehicleMiles - businessMiles);
    const safeTotal = Math.max(totalVehicleMiles, businessMiles, 1);
    const businessPercentage = (businessMiles / safeTotal) * 100;
    const nonBusinessPercentage = (nonBusinessMiles / safeTotal) * 100;

    return {
      totalVehicleMiles,
      businessMiles,
      nonBusinessMiles,
      businessPercentage,
      nonBusinessPercentage,
      vehicleCount: segments.length,
    };
  }, [shifts, selectedYear]);

  const getNextQuarterlyTaxInfo = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const quarterDueDates = [
      { quarter: 1, dueDate: new Date(currentYear, 3, 15), label: "Q1" },
      { quarter: 2, dueDate: new Date(currentYear, 5, 15), label: "Q2" },
      { quarter: 3, dueDate: new Date(currentYear, 8, 15), label: "Q3" },
      { quarter: 4, dueDate: new Date(currentYear + 1, 0, 15), label: "Q4" },
    ];
    for (const quarter of quarterDueDates) {
      if (quarter.dueDate > now) {
        const daysUntilDue = Math.ceil(
          (quarter.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { quarter: quarter.label, year: currentYear, dueDate: quarter.dueDate, daysUntilDue };
      }
    }
    return {
      quarter: "Q1",
      year: currentYear + 1,
      dueDate: new Date(currentYear + 1, 3, 15),
      daysUntilDue: Math.ceil(
        (new Date(currentYear + 1, 3, 15).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  };

  const nextTaxInfo = getNextQuarterlyTaxInfo();

  const formatCurrency = (amount: number) =>
    formatCurrencyWithContentMode(amount, isContentModeEnabled);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const calculateCumulativeQuarterlyTaxes = () => {
    const quarterlyTaxes: number[] = [];
    const quarterlyBreakdowns: Array<{
      cumulativeIncome: number;
      brackets: Array<{
        rate: number;
        min: number;
        max: number;
        incomeInBracket: number;
        taxFromBracket: number;
      }>;
      totalCumulativeTax: number;
      incrementalTax: number;
    }> = [];

    let cumulativeIncome = 0;
    let previousCumulativeTax = 0;

    for (let i = 0; i < quarterlyData.length; i++) {
      const quarterNetIncome = quarterlyData[i].summary.netIncome;
      cumulativeIncome += quarterNetIncome;

      let cumulativeTax = 0;
      let remainingIncome = cumulativeIncome;
      const brackets: typeof quarterlyBreakdowns[0]["brackets"] = [];

      if (cumulativeIncome > 0) {
        for (const bracket of TAX_BRACKETS) {
          if (remainingIncome <= 0) break;
          const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min + 1);
          const taxFromBracket = taxableAtThisBracket * bracket.rate;
          cumulativeTax += taxFromBracket;
          brackets.push({
            rate: bracket.rate,
            min: bracket.min,
            max: bracket.max === Infinity ? Infinity : bracket.max,
            incomeInBracket: taxableAtThisBracket,
            taxFromBracket,
          });
          remainingIncome -= taxableAtThisBracket;
        }
      }

      const incrementalTax = cumulativeTax - previousCumulativeTax;
      quarterlyTaxes.push(incrementalTax);
      quarterlyBreakdowns.push({ cumulativeIncome, brackets, totalCumulativeTax: cumulativeTax, incrementalTax });
      previousCumulativeTax = cumulativeTax;
    }

    return { quarterlyTaxes, quarterlyBreakdowns };
  };

  const { quarterlyTaxes: cumulativeQuarterlyTaxes, quarterlyBreakdowns } = useMemo(
    () => calculateCumulativeQuarterlyTaxes(),
    [quarterlyData]
  );

  const { width } = useWindowDimensions();
  const [chartContainerWidth, setChartContainerWidth] = useState(0);
  const Y_AXIS_WIDTH = 50;
  // On web, cap effective width to the 768px content column (minus card padding ~32px each side)
  const effectiveWidth = Platform.OS === "web" ? Math.min(width, 768) : width;
  const barChartWidth = (chartContainerWidth > 0 ? chartContainerWidth : effectiveWidth - 80) - Y_AXIS_WIDTH;

  // Quarterly: 8 bars (2 per quarter), intra-pair spacing=4, inter-pair spacing=18
  // Fill formula: 8*bw + 3*4 + 3*18 = barChartWidth  → bw = (barChartWidth - 66) / 8
  const quarterlyBarWidth = Math.max(20, Math.floor((barChartWidth - 66) / 8));
  const quarterlyInterSpacing = Math.max(8, Math.floor((barChartWidth - 8 * quarterlyBarWidth - 3 * 4) / 3));

  // Monthly: 12 bars, spacing between bars.
  // On web fill the full width; on native use fixed size with horizontal scroll.
  const isWeb = Platform.OS === "web";
  const MONTHLY_SPACING = isWeb ? 6 : 14;
  const monthlyBarWidth = isWeb
    ? Math.max(14, Math.floor((barChartWidth - 11 * MONTHLY_SPACING) / 12))
    : 22;

  if (shifts.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-muted-foreground">No completed shifts for tax reporting</Text>
      </View>
    );
  }

  return (
    <View className="gap-6">
      {/* Year selector */}
      <View className="items-end">
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {`${year} Tax Year`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </View>

      {/* Quarterly Tax Reminder Banner */}
      <Alert variant="warning">
        <Calendar size={16} color={isDark ? "#fbbf24" : "#92400e"} />
        <AlertTitle>Quarterly Tax Payment Reminder</AlertTitle>
        <AlertDescription>
          {nextTaxInfo.quarter} {nextTaxInfo.year} quarterly taxes are due on{" "}
          <Text className="font-bold">{nextTaxInfo.dueDate.toLocaleDateString()}</Text>{" "}
          ({nextTaxInfo.daysUntilDue} days away). Consider setting aside funds for estimated tax
          payments based on your earnings.
        </AlertDescription>
      </Alert>

      {/* Yearly summary card */}
      <Card style={{ backgroundColor: limeBgColor, borderColor: limeBorderColor }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex-row items-center gap-2 text-lg font-medium">
            <FileText size={20} color={limeIconColor} />
            <Text className="text-foreground font-medium ml-2">Tax Summary for {selectedYear}</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View className="flex-row flex-wrap gap-y-4">
            <View className="w-1/2">
              <View className="flex-row items-center">
                <DollarSign size={16} color={limeIconColor} />
                <Text style={{ color: limeLabelColor }} className="text-sm ml-1">Gross Income</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.totalIncome)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <FileText size={16} color={limeIconColor} />
                <Text style={{ color: limeLabelColor }} className="text-sm ml-1">Total Deductions</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.totalExpenses)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <Clock size={16} color={limeIconColor} />
                <Text style={{ color: limeLabelColor }} className="text-sm ml-1">Total Hours</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatDuration(yearlyData.totalHours)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <Car size={16} color={limeIconColor} />
                <Text style={{ color: limeLabelColor }} className="text-sm ml-1">Business Mileage</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {yearlyData.totalMileage.toLocaleString()} miles
              </Text>
            </View>

            <View className="w-full">
              <View className="flex-row items-center">
                <DollarSign size={16} color={limeIconColor} />
                <Text style={{ color: limeLabelColor }} className="text-sm ml-1">Net Income (Taxable)</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.netIncome)}
              </Text>
            </View>
          </View>

          {/* Vehicle Mileage Analysis */}
          {vehicleMileageBreakdown.totalVehicleMiles > 0 && (() => {
            const totalVehicleMiles = vehicleMileageBreakdown.totalVehicleMiles;
            const businessMiles = yearlyData.totalMileage;
            const personalMiles = Math.max(0, totalVehicleMiles - businessMiles);
            const safeTotal = Math.max(totalVehicleMiles, businessMiles, 1);
            const businessPct = (businessMiles / safeTotal) * 100;
            const personalPct = (personalMiles / safeTotal) * 100;
            const multiVehicle = vehicleMileageBreakdown.vehicleCount > 1;
            return (
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: limeBorderColor }}>
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    <Car size={16} color={limeIconColor} />
                    <Text style={{ color: limeLabelColor }} className="text-sm font-medium ml-1">
                      Vehicle Mileage Analysis
                    </Text>
                  </View>
                  {multiVehicle && (
                    <Text className="text-xs text-muted-foreground">
                      {vehicleMileageBreakdown.vehicleCount} vehicles detected
                    </Text>
                  )}
                </View>
                {multiVehicle && (
                  <Text className="text-xs text-muted-foreground mb-3">
                    A vehicle change was detected this year. Total miles combines each vehicle's span separately.
                  </Text>
                )}
                <View className="flex-row flex-wrap gap-y-2">
                  <View className="w-1/2">
                    <Text className="text-muted-foreground text-sm">Total Vehicle Miles:</Text>
                    <Text className="font-medium text-foreground text-sm">
                      {totalVehicleMiles.toLocaleString()} mi
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-muted-foreground text-sm">Business Miles:</Text>
                    <Text className="font-medium text-green-600 text-sm">
                      {businessMiles.toLocaleString()} mi{" "}
                      <Text className="text-xs">({businessPct.toFixed(1)}%)</Text>
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-muted-foreground text-sm">Personal Miles:</Text>
                    <Text className="font-medium text-orange-600 text-sm">
                      {personalMiles.toLocaleString()} mi{" "}
                      <Text className="text-xs">({personalPct.toFixed(1)}%)</Text>
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-muted-foreground text-sm">Deduction:</Text>
                    <Text className="font-medium text-foreground text-sm">
                      {formatCurrency(yearlyData.mileDeduction)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </CardContent>
      </Card>

      {/* Detailed breakdown tabs */}
      <Tabs defaultValue="quarterly">
        <TabsList>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        {/* Quarterly Tab */}
        <TabsContent value="quarterly" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Quarterly Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {quarterlyData.length > 0 && (
                <View className="mb-4" onLayout={(e) => setChartContainerWidth(e.nativeEvent.layout.width)}>
                  <BarChart
                    data={quarterlyData.flatMap((q) => [
                      { value: Math.max(0, Math.round(q.summary.totalIncome)), label: `Q${q.quarter}`, frontColor: "#4ade80", spacing: 4, labelTextStyle: { color: chartLabelColor, fontSize: 10 } },
                      { value: Math.max(0, Math.round(q.summary.netIncome)), frontColor: "#60a5fa", spacing: quarterlyInterSpacing },
                    ])}
                    width={barChartWidth}
                    barWidth={quarterlyBarWidth}
                    noOfSections={4}
                    roundedTop
                    isAnimated
                    yAxisLabelPrefix="$"
                    yAxisLabelWidth={Y_AXIS_WIDTH}
                    yAxisTextStyle={{ color: chartLabelColor, fontSize: 10 }}
                    yAxisColor="transparent"
                    xAxisColor={chartAxisColor}
                    rulesColor={chartRulesColor}
                  />
                  <View className="flex-row gap-4 mt-2 justify-center">
                    <View className="flex-row items-center gap-1">
                      <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#4ade80" }} />
                      <Text className="text-xs text-muted-foreground">Income</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#60a5fa" }} />
                      <Text className="text-xs text-muted-foreground">Net Income</Text>
                    </View>
                  </View>
                </View>
              )}
              <View className="flex-row flex-wrap gap-3">
                {quarterlyData.map((q, index) => {
                  const breakdown = quarterlyBreakdowns[index];
                  const isOpen = openBreakdowns[index] || false;
                  return (
                    <View
                      key={q.quarter}
                      className="w-[48%] overflow-hidden rounded-lg border border-border"
                    >
                      <View className="py-2 px-3 flex-row justify-between items-center" style={{ backgroundColor: themeColors.muted }}>
                        <Text className="text-sm font-medium text-foreground">
                          Q{q.quarter} {selectedYear}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {q.quarter === 1 && "Jan–Mar"}
                          {q.quarter === 2 && "Apr–Jun"}
                          {q.quarter === 3 && "Jul–Sep"}
                          {q.quarter === 4 && "Oct–Dec"}
                        </Text>
                      </View>
                      <View className="p-3 gap-1">
                        <View className="flex-row justify-between">
                          <Text className="text-muted-foreground text-sm">Income:</Text>
                          <Text className="font-medium text-sm text-foreground">
                            {formatCurrency(q.summary.totalIncome)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-muted-foreground text-sm">Expenses:</Text>
                          <Text className="font-medium text-sm text-foreground">
                            {formatCurrency(q.summary.totalExpenses)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-muted-foreground text-sm">Mileage:</Text>
                          <Text className="font-medium text-sm text-foreground">
                            {q.summary.totalMileage} mi
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-muted-foreground text-sm">Net:</Text>
                          <Text className="font-medium text-sm text-foreground">
                            {formatCurrency(q.summary.netIncome)}
                          </Text>
                        </View>
                        <View className="mt-1 pt-1" style={{ borderTopWidth: 1, borderTopColor: themeColors.border }}>
                          <View className="flex-row items-center gap-1">
                            <Text className="text-muted-foreground text-xs">Est. Taxes:</Text>
                            {/* 🚩 FLAG: Tooltip → inline note text */}
                            <Info size={12} color="#9ca3af" />
                          </View>
                          <Text className="font-medium text-xs text-red-600">
                            {formatCurrency(cumulativeQuarterlyTaxes[index] || 0)}
                          </Text>
                        </View>

                        {/* 🚩 FLAG: Collapsible → state-based show/hide */}
                        {breakdown && breakdown.cumulativeIncome > 0 && (
                          <View className="mt-2">
                            <Pressable
                              onPress={() =>
                                setOpenBreakdowns((prev) => ({
                                  ...prev,
                                  [index]: !prev[index],
                                }))
                              }
                              className="flex-row items-center gap-1"
                            >
                              {isOpen ? (
                                <ChevronUp size={12} color="#65a30d" />
                              ) : (
                                <ChevronDown size={12} color="#65a30d" />
                              )}
                              <Text style={{ color: isDark ? "#a3e635" : "#65a30d" }} className="text-xs">
                                View Tax Calculation
                              </Text>
                            </Pressable>

                            {isOpen && (
                              <View className="mt-2 rounded p-2 gap-1" style={{ backgroundColor: themeColors.muted }}>
                                <Text style={{ color: limeLabelColor }} className="font-medium text-xs">
                                  YTD Income: {formatCurrency(breakdown.cumulativeIncome)}
                                </Text>
                                {breakdown.brackets.map(
                                  (bracket, bIdx) =>
                                    bracket.incomeInBracket > 0 && (
                                      <View
                                        key={bIdx}
                                        className="flex-row justify-between items-start gap-2"
                                      >
                                        <View>
                                          <Text className="text-muted-foreground text-[10px]">
                                            {formatCurrency(bracket.incomeInBracket)} @{" "}
                                            {(bracket.rate * 100).toFixed(0)}%
                                          </Text>
                                          <Text className="text-[9px] text-muted-foreground">
                                            ({formatCurrency(bracket.min)} -{" "}
                                            {bracket.max === Infinity
                                              ? "up"
                                              : formatCurrency(bracket.max)}
                                            )
                                          </Text>
                                        </View>
                                        <Text className="font-medium text-[10px] text-foreground">
                                          {formatCurrency(bracket.taxFromBracket)}
                                        </Text>
                                      </View>
                                    )
                                )}
                                <View className="pt-1 flex-row justify-between" style={{ borderTopWidth: 1, borderTopColor: themeColors.border }}>
                                  <Text className="font-medium text-xs text-foreground">
                                    Total YTD Tax:
                                  </Text>
                                  <Text className="font-medium text-xs text-foreground">
                                    {formatCurrency(breakdown.totalCumulativeTax)}
                                  </Text>
                                </View>
                                {index > 0 && (
                                  <View className="flex-row justify-between">
                                    <Text className="text-muted-foreground text-xs">
                                      Prev Qtrs Tax:
                                    </Text>
                                    <Text className="text-muted-foreground text-xs">
                                      -{formatCurrency(breakdown.totalCumulativeTax - breakdown.incrementalTax)}
                                    </Text>
                                  </View>
                                )}
                                <View className="pt-1 flex-row justify-between" style={{ borderTopWidth: 1, borderTopColor: limeBorderColor }}>
                                  <Text className="font-medium text-xs text-red-600">
                                    Q{q.quarter} Tax Due:
                                  </Text>
                                  <Text className="font-medium text-xs text-red-600">
                                    {formatCurrency(breakdown.incrementalTax)}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Monthly Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 && (
                <View className="mb-4" onLayout={(e) => setChartContainerWidth(e.nativeEvent.layout.width)}>
                  {isWeb ? (
                    <BarChart
                      data={monthlyData.map((m) => ({
                        value: Math.max(0, Math.round(m.summary.totalIncome)),
                        label: MONTH_NAMES[m.month],
                        frontColor: "#4ade80",
                        labelTextStyle: { color: chartLabelColor, fontSize: 9 },
                      }))}
                      width={barChartWidth}
                      barWidth={monthlyBarWidth}
                      spacing={MONTHLY_SPACING}
                      noOfSections={4}
                      roundedTop
                      isAnimated
                      yAxisLabelPrefix="$"
                      yAxisLabelWidth={Y_AXIS_WIDTH}
                      yAxisTextStyle={{ color: chartLabelColor, fontSize: 10 }}
                      yAxisColor="transparent"
                      xAxisColor={chartAxisColor}
                      rulesColor={chartRulesColor}
                    />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <BarChart
                        data={monthlyData.map((m) => ({
                          value: Math.max(0, Math.round(m.summary.totalIncome)),
                          label: MONTH_NAMES[m.month],
                          frontColor: "#4ade80",
                          labelTextStyle: { color: chartLabelColor, fontSize: 9 },
                        }))}
                        width={barChartWidth}
                        barWidth={monthlyBarWidth}
                        spacing={MONTHLY_SPACING}
                        noOfSections={4}
                        roundedTop
                        isAnimated
                        yAxisLabelPrefix="$"
                        yAxisLabelWidth={Y_AXIS_WIDTH}
                        yAxisTextStyle={{ color: chartLabelColor, fontSize: 10 }}
                        yAxisColor="transparent"
                        xAxisColor={chartAxisColor}
                        rulesColor={chartRulesColor}
                      />
                    </ScrollView>
                  )}
                  {!isWeb && (
                    <Text style={{ color: chartLabelColor }} className="text-xs text-center mt-1">
                      ← swipe chart to see all months →
                    </Text>
                  )}
                </View>
              )}
              <View className="flex-row flex-wrap gap-3">
                {monthlyData.map((m) => (
                  <View
                    key={m.month}
                    className="w-[48%] overflow-hidden rounded-lg border border-border"
                  >
                    <View className="py-2 px-3" style={{ backgroundColor: themeColors.muted }}>
                      <Text className="text-sm font-medium text-foreground">
                        {MONTH_NAMES[m.month]} {selectedYear}
                      </Text>
                    </View>
                    <View className="p-3 gap-1">
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground text-sm">Income:</Text>
                        <Text className="font-medium text-sm text-foreground">
                          {formatCurrency(m.summary.totalIncome)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground text-sm">Expenses:</Text>
                        <Text className="font-medium text-sm text-foreground">
                          {formatCurrency(m.summary.totalExpenses)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground text-sm">Mileage:</Text>
                        <Text className="font-medium text-sm text-foreground">
                          {m.summary.totalMileage} mi
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground text-sm">Net:</Text>
                        <Text className="font-medium text-sm text-foreground">
                          {formatCurrency(m.summary.netIncome)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Tax tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Tax Filing Tips</CardTitle>
        </CardHeader>
        <CardContent className="gap-2">
          {[
            "Track your mileage with detailed logs",
            "Consider speaking with a tax professional",
            "Mileage may be deductible as a business expense",
            "Save this summary for your tax preparation",
            "Estimated taxes are calculated using federal tax brackets",
          ].map((tip, i) => (
            <Text key={i} className="text-sm text-foreground">
              • {tip}
            </Text>
          ))}
        </CardContent>
      </Card>
    </View>
  );
};

export default TaxReport;
