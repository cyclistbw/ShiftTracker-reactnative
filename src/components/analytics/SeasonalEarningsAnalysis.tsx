// 🚩 FLAG: <div>/<span> → <View>/<Text>; animate-spin → ActivityIndicator
// 🚩 FLAG: lucide-react → lucide-react-native; hover:bg-muted/20 → removed (no hover on mobile)
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { getCombinedDayOfWeekInsights } from "@/lib/shift-analytics-service";

const SeasonalEarningsAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getCombinedDayOfWeekInsights(user.id);
        setInsights(data);
      } catch (err) {
        console.error("Error fetching seasonal insights:", err);
        setError("Failed to load seasonal earnings analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp size={16} color="#16a34a" />;
      case "down":
        return <TrendingDown size={16} color="#dc2626" />;
      default:
        return <Minus size={16} color="#9ca3af" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "bg-green-100 border-green-200";
      case "down":
        return "bg-red-100 border-red-200";
      default:
        return "bg-gray-100 border-gray-200";
    }
  };

  const getTrendTextColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-800";
      case "down":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seasonal Earnings Analysis</CardTitle>
        </CardHeader>
        <CardContent className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#84cc16" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seasonal Earnings Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-center text-muted-foreground py-4">{error}</Text>
        </CardContent>
      </Card>
    );
  }

  const bestCurrentDay = insights[0];
  const averageRecentHourly =
    insights.length > 0
      ? insights.reduce((sum, day) => sum + day.weighted_recent_average_hourly, 0) /
        insights.length
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Seasonal Earnings Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <Text className="text-center text-muted-foreground py-4">
            No earnings data available for analysis
          </Text>
        ) : (
          <View className="space-y-4">
            {/* Summary Stats */}
            <View className="flex-row gap-4 p-4 bg-muted/30 rounded-lg">
              <View className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">
                  Current Season Average
                </Text>
                <Text className="text-2xl font-bold text-primary">
                  {formatCurrency(averageRecentHourly)}/hr
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">Best Current Day</Text>
                <Text className="text-base font-semibold text-foreground">
                  {bestCurrentDay?.day_of_week} -{" "}
                  {formatCurrency(bestCurrentDay?.weighted_recent_average_hourly || 0)}/hr
                </Text>
              </View>
            </View>

            {/* Day by Day Breakdown */}
            <View className="space-y-3">
              <Text className="font-medium text-foreground">Day of Week Performance</Text>
              {insights.map((day) => (
                <View
                  key={day.day_of_week}
                  className="flex-row items-center justify-between p-3 border border-border rounded-lg"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-2">
                      {getTrendIcon(day.seasonal_trend)}
                      <Text className="font-medium text-foreground">{day.day_of_week}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded border ${getTrendColor(day.seasonal_trend)}`}>
                      <Text className={`text-xs ${getTrendTextColor(day.seasonal_trend)}`}>
                        {day.seasonal_trend === "up"
                          ? "Trending Up"
                          : day.seasonal_trend === "down"
                          ? "Trending Down"
                          : "Stable"}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="font-semibold text-sm text-foreground">
                      {formatCurrency(day.weighted_recent_average_hourly)}/hr
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      All-time: {formatCurrency(day.weighted_average_hourly)}/hr
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {day.total_shifts} shifts • {day.total_hours.toFixed(1)} hours
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
};

export default SeasonalEarningsAnalysis;
