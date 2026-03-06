// 🚩 FLAG: recharts (BarChart, PieChart) → not available in RN; replaced with simple text-based data tables
//          Use react-native-gifted-charts or victory-native for native charts
// 🚩 FLAG: Collapsible/CollapsibleContent/CollapsibleTrigger (Radix) → useState-based show/hide
// 🚩 FLAG: Tooltip/TooltipProvider (Radix) → no-op (our stub returns null; tooltip text shown inline)
// 🚩 FLAG: ChartContainer/ChartTooltip/ChartTooltipContent → removed (charts not rendered)
// 🚩 FLAG: <div>/<span> → <View>/<Text>; grid → flex-row flex-wrap
import { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Shift } from "@/types/shift";
import {
  getYearlyReportData,
  getAvailableYears,
  getQuarterlyBreakdown,
  getMonthlyBreakdown,
  getCategoryBreakdown,
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
  Receipt,
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

interface TaxReportProps {
  shifts: Shift[];
}

const COLORS = ["#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800"];
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
  const { settings } = useBusinessSettings();
  const { vehicles } = useVehicles();
  const mileageRate = settings?.defaultMileageRate || 0.655;

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
  const categoryData = useMemo(
    () => getCategoryBreakdown(shifts, selectedYear, mileageRate),
    [shifts, selectedYear, mileageRate]
  );

  const vehicleMileageBreakdown = useMemo(() => {
    const yearShifts = shifts.filter((shift) => {
      const shiftYear = shift.startTime.getFullYear();
      return (
        shiftYear === selectedYear &&
        shift.endTime &&
        !shift.isActive &&
        shift.mileageEnd &&
        shift.mileageStart !== null
      );
    });

    const odometerShifts = yearShifts.filter(
      (shift) =>
        typeof shift.mileageStart === "number" &&
        typeof shift.mileageEnd === "number" &&
        shift.mileageStart >= 100000 &&
        shift.mileageEnd > shift.mileageStart
    );

    if (odometerShifts.length === 0) {
      return {
        totalVehicleMiles: 0,
        businessMiles: 0,
        nonBusinessMiles: 0,
        businessPercentage: 0,
        nonBusinessPercentage: 0,
      };
    }

    const shiftsByStart = [...odometerShifts].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
    const shiftsByEnd = [...odometerShifts].sort(
      (a, b) => a.endTime!.getTime() - b.endTime!.getTime()
    );

    const earliestMileage = shiftsByStart[0].mileageStart as number;
    const latestMileage = shiftsByEnd[shiftsByEnd.length - 1].mileageEnd as number;
    const totalVehicleMiles = latestMileage - earliestMileage;

    const businessMiles = odometerShifts.reduce((sum, shift) => {
      return sum + ((shift.mileageEnd as number) - (shift.mileageStart as number));
    }, 0);

    let nonBusinessMiles = totalVehicleMiles - businessMiles;
    if (nonBusinessMiles < 0) nonBusinessMiles = 0;

    const safeTotal = Math.max(totalVehicleMiles, businessMiles, 0);
    const businessPercentage = safeTotal > 0 ? (businessMiles / safeTotal) * 100 : 0;
    const nonBusinessPercentage = safeTotal > 0 ? (nonBusinessMiles / safeTotal) * 100 : 0;

    return { totalVehicleMiles: safeTotal, businessMiles, nonBusinessMiles, businessPercentage, nonBusinessPercentage };
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

  if (shifts.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-gray-500">No completed shifts for tax reporting</Text>
      </View>
    );
  }

  return (
    <View className="space-y-6">
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
                {year} Tax Year
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </View>

      {/* Quarterly Tax Reminder Banner */}
      <Alert variant="warning">
        <Calendar size={16} color="#92400e" />
        <AlertTitle>Quarterly Tax Payment Reminder</AlertTitle>
        <AlertDescription>
          {nextTaxInfo.quarter} {nextTaxInfo.year} quarterly taxes are due on{" "}
          <Text className="font-bold">{nextTaxInfo.dueDate.toLocaleDateString()}</Text>{" "}
          ({nextTaxInfo.daysUntilDue} days away). Consider setting aside funds for estimated tax
          payments based on your earnings.
        </AlertDescription>
      </Alert>

      {/* Yearly summary card */}
      <Card className="bg-lime-50 border-lime-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex-row items-center gap-2 text-lg font-medium">
            <FileText size={20} color="#4d7c0f" />
            <Text className="text-foreground font-medium ml-2">Tax Summary for {selectedYear}</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View className="flex-row flex-wrap gap-y-4">
            <View className="w-1/2">
              <View className="flex-row items-center">
                <DollarSign size={16} color="#4d7c0f" />
                <Text className="text-sm text-lime-700 ml-1">Gross Income</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.totalIncome)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <Receipt size={16} color="#4d7c0f" />
                <Text className="text-sm text-lime-700 ml-1">Total Expenses</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.totalExpenses)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <Clock size={16} color="#4d7c0f" />
                <Text className="text-sm text-lime-700 ml-1">Total Hours</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatDuration(yearlyData.totalHours)}
              </Text>
            </View>

            <View className="w-1/2">
              <View className="flex-row items-center">
                <Car size={16} color="#4d7c0f" />
                <Text className="text-sm text-lime-700 ml-1">Business Mileage</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {yearlyData.totalMileage.toLocaleString()} miles
              </Text>
            </View>

            <View className="w-full">
              <View className="flex-row items-center">
                <DollarSign size={16} color="#4d7c0f" />
                <Text className="text-sm text-lime-700 ml-1">Net Income (Taxable)</Text>
              </View>
              <Text className="text-lg font-medium text-foreground">
                {formatCurrency(yearlyData.netIncome)}
              </Text>
            </View>
          </View>

          {/* Vehicle Mileage Analysis */}
          {vehicleMileageBreakdown.totalVehicleMiles > 0 && (
            <View className="mt-4 pt-4 border-t border-lime-200">
              <View className="flex-row items-center mb-3">
                <Car size={16} color="#4d7c0f" />
                <Text className="text-sm font-medium text-lime-700 ml-1">
                  Vehicle Mileage Analysis
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-y-2">
                <View className="w-1/2">
                  <Text className="text-muted-foreground text-sm">Total Vehicle Miles:</Text>
                  <Text className="font-medium text-foreground text-sm">
                    {vehicleMileageBreakdown.totalVehicleMiles.toLocaleString()} mi
                  </Text>
                </View>
                <View className="w-1/2">
                  <Text className="text-muted-foreground text-sm">Business Miles:</Text>
                  <Text className="font-medium text-green-600 text-sm">
                    {vehicleMileageBreakdown.businessMiles.toLocaleString()} mi{" "}
                    <Text className="text-xs">
                      ({vehicleMileageBreakdown.businessPercentage.toFixed(1)}%)
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2">
                  <Text className="text-muted-foreground text-sm">Personal Miles:</Text>
                  <Text className="font-medium text-orange-600 text-sm">
                    {vehicleMileageBreakdown.nonBusinessMiles.toLocaleString()} mi{" "}
                    <Text className="text-xs">
                      ({vehicleMileageBreakdown.nonBusinessPercentage.toFixed(1)}%)
                    </Text>
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
          )}
        </CardContent>
      </Card>

      {/* Detailed breakdown tabs */}
      <Tabs defaultValue="quarterly">
        <TabsList>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Quarterly Tab */}
        <TabsContent value="quarterly" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Quarterly Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 🚩 FLAG: recharts BarChart → text-based data table (install react-native-gifted-charts for charts) */}
              <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-xs text-muted-foreground text-center">
                  📊 Chart view requires react-native-gifted-charts or victory-native
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {quarterlyData.map((q, index) => {
                  const breakdown = quarterlyBreakdowns[index];
                  const isOpen = openBreakdowns[index] || false;
                  return (
                    <View
                      key={q.quarter}
                      className="w-[48%] overflow-hidden rounded-lg border border-border"
                    >
                      <View className="py-2 px-3 bg-gray-50 flex-row justify-between items-center">
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
                      <View className="p-3 space-y-1">
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
                        <View className="mt-1 pt-1 border-t border-gray-200">
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
                              <Text className="text-xs text-lime-600">
                                View Tax Calculation
                              </Text>
                            </Pressable>

                            {isOpen && (
                              <View className="mt-2 bg-gray-50 rounded p-2 space-y-1">
                                <Text className="font-medium text-lime-700 text-xs">
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
                                <View className="pt-1 border-t border-gray-200 flex-row justify-between">
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
                                <View className="pt-1 border-t border-lime-200 flex-row justify-between">
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
              {/* 🚩 FLAG: recharts BarChart → text-based grid */}
              <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-xs text-muted-foreground text-center">
                  📊 Chart view requires react-native-gifted-charts or victory-native
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {monthlyData.map((m) => (
                  <View
                    key={m.month}
                    className="w-[48%] overflow-hidden rounded-lg border border-border"
                  >
                    <View className="py-2 px-3 bg-gray-50">
                      <Text className="text-sm font-medium text-foreground">
                        {MONTH_NAMES[m.month]} {selectedYear}
                      </Text>
                    </View>
                    <View className="p-3 space-y-1">
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

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 🚩 FLAG: recharts PieChart/ChartContainer → color-coded list */}
              {categoryData.length > 0 ? (
                <View className="border border-border rounded-md divide-y divide-border">
                  {categoryData.map((category, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between p-3"
                    >
                      <View className="flex-row items-center">
                        <View
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <Text className="text-foreground text-sm">{category.category}</Text>
                      </View>
                      <Text className="font-medium text-foreground text-sm">
                        {formatCurrency(category.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-muted-foreground">No expenses recorded</Text>
                </View>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tax tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Tax Filing Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Keep all receipts for your expenses",
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
