// 🚩 FLAG: <table>/<tr>/<td> → <View>/<Text> rows; animate-spin → ActivityIndicator
// 🚩 FLAG: lucide-react → lucide-react-native; overflow-x-auto → ScrollView horizontal
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Info, Trophy } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useContentMode } from "@/context/ContentModeContext";

interface PlatformAnalyticsProps {
  selectedYear: number;
  refreshKey: number;
}

interface PlatformStats {
  platform: string;
  totalShifts: number;
  totalEarnings: number;
  totalHours: number;
  totalMiles: number;
  avgHourly: number;
  avgPerMile: number;
}

const PlatformAnalytics: React.FC<PlatformAnalyticsProps> = ({ selectedYear, refreshKey }) => {
  const { user } = useAuth();
  const { isContentModeEnabled } = useContentMode();
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMultiAppShifts, setHasMultiAppShifts] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchPlatformData();
  }, [user?.id, selectedYear, refreshKey]);

  const fetchPlatformData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const startDate = `${selectedYear}-01-01T00:00:00`;
      const endDate =
        selectedYear === new Date().getFullYear()
          ? new Date().toISOString()
          : `${selectedYear}-12-31T23:59:59`;

      const [regular, imported] = await Promise.all([
        supabase
          .from("shift_summaries")
          .select("platform, earnings, hours_worked, miles_driven")
          .eq("user_id", user.id)
          .gte("start_time", startDate)
          .lte("start_time", endDate),
        supabase
          .from("shift_summaries_import")
          .select("platform, earnings, hours_worked, miles_driven")
          .eq("user_id", user.id)
          .gte("start_time", startDate)
          .lte("start_time", endDate),
      ]);

      const allShifts = [...(regular.data || []), ...(imported.data || [])];
      const aggregated: Record<string, PlatformStats> = {};
      let foundMultiApp = false;

      for (const shift of allShifts) {
        const earnings = Number(shift.earnings) || 0;
        const hours = Number(shift.hours_worked) || 0;
        const miles = Number(shift.miles_driven) || 0;
        const raw = (shift.platform || "").trim();
        const names = raw
          ? raw
              .split(",")
              .map((p: string) => p.trim())
              .filter(Boolean)
          : ["Untagged"];

        if (names.length > 1) foundMultiApp = true;
        const share = names.length;

        for (const name of names) {
          const key = name.toLowerCase();
          if (!aggregated[key]) {
            aggregated[key] = {
              platform: name,
              totalShifts: 0,
              totalEarnings: 0,
              totalHours: 0,
              totalMiles: 0,
              avgHourly: 0,
              avgPerMile: 0,
            };
          }
          aggregated[key].totalShifts += 1 / share;
          aggregated[key].totalEarnings += earnings / share;
          aggregated[key].totalHours += hours / share;
          aggregated[key].totalMiles += miles / share;
        }
      }

      const result = Object.values(aggregated).map((p) => ({
        ...p,
        totalShifts: Math.round(p.totalShifts),
        avgHourly: p.totalHours > 0 ? p.totalEarnings / p.totalHours : 0,
        avgPerMile: p.totalMiles > 0 ? p.totalEarnings / p.totalMiles : 0,
      }));

      result.sort((a, b) => b.avgHourly - a.avgHourly);
      setHasMultiAppShifts(foundMultiApp);
      setPlatforms(result);
    } catch (err) {
      console.error("Error fetching platform analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => (isContentModeEnabled ? "••••" : `$${n.toFixed(2)}`);
  const fmtNum = (n: number, decimals = 1) =>
    isContentModeEnabled ? "••" : n.toFixed(decimals);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent className="items-center py-8">
          <ActivityIndicator size="large" color="#84cc16" />
        </CardContent>
      </Card>
    );
  }

  if (platforms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-sm text-muted-foreground">
            No platform data available for {selectedYear}. Tag your shifts with a gig app when
            ending them to see comparisons here.
          </Text>
        </CardContent>
      </Card>
    );
  }

  // 🚩 FLAG: HTML table → View-based rows with ScrollView for horizontal overflow
  const COL_WIDTHS = [100, 50, 70, 50, 50, 60, 60];
  const HEADERS = ["Platform", "Shifts", "Earnings", "Hours", "Miles", "$/hr", "$/mi"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-row items-center gap-2">
          <Trophy size={20} color="#84cc16" />
          <Text className="text-foreground font-semibold ml-2">Platform Comparison</Text>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMultiAppShifts && (
          <Alert>
            <Info size={16} color="#6b7280" />
            <AlertDescription>
              Some shifts are tagged with multiple platforms. Their earnings, hours, and miles are
              split evenly across each tagged app.
            </AlertDescription>
          </Alert>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View className="flex-row border-b border-border pb-2">
              {HEADERS.map((header, i) => (
                <View key={header} style={{ width: COL_WIDTHS[i] }}>
                  <Text
                    className={`text-xs font-medium text-muted-foreground ${i > 0 ? "text-right" : ""}`}
                  >
                    {header}
                  </Text>
                </View>
              ))}
            </View>

            {/* Data rows */}
            {platforms.map((p, i) => {
              const isBest = i === 0 && platforms.length > 1;
              const isWorst = i === platforms.length - 1 && platforms.length > 1;
              return (
                <View
                  key={p.platform}
                  className={`flex-row py-2 border-b border-border/50 items-center ${
                    isBest ? "bg-green-500/10" : isWorst ? "bg-orange-500/10" : ""
                  }`}
                >
                  <View style={{ width: COL_WIDTHS[0] }} className="flex-row items-center gap-1">
                    <Text className="font-medium text-sm text-foreground" numberOfLines={1}>
                      {p.platform}
                    </Text>
                    {isBest && (
                      <Badge variant="default" className="bg-green-600 px-1">
                        Best
                      </Badge>
                    )}
                    {isWorst && (
                      <Badge variant="secondary" className="bg-orange-500 px-1">
                        Low
                      </Badge>
                    )}
                  </View>
                  <View style={{ width: COL_WIDTHS[1] }}>
                    <Text className="text-sm text-foreground text-right">{p.totalShifts}</Text>
                  </View>
                  <View style={{ width: COL_WIDTHS[2] }}>
                    <Text className="text-sm text-foreground text-right">
                      {fmt(p.totalEarnings)}
                    </Text>
                  </View>
                  <View style={{ width: COL_WIDTHS[3] }}>
                    <Text className="text-sm text-foreground text-right">
                      {fmtNum(p.totalHours)}
                    </Text>
                  </View>
                  <View style={{ width: COL_WIDTHS[4] }}>
                    <Text className="text-sm text-foreground text-right">
                      {fmtNum(p.totalMiles, 0)}
                    </Text>
                  </View>
                  <View style={{ width: COL_WIDTHS[5] }}>
                    <Text className="text-sm font-semibold text-foreground text-right">
                      {fmt(p.avgHourly)}
                    </Text>
                  </View>
                  <View style={{ width: COL_WIDTHS[6] }}>
                    <Text className="text-sm text-foreground text-right">
                      {fmt(p.avgPerMile)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </CardContent>
    </Card>
  );
};

export default PlatformAnalytics;
