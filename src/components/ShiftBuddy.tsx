// 🚩 FLAG: localStorage → AsyncStorage (async); useIsMobile always true → removed
// 🚩 FLAG: animate-spin → ActivityIndicator; animate-gentle-bounce → removed
// 🚩 FLAG: ScrollArea → ScrollView with ref.scrollToEnd(); Textarea → TextInput multiline
// 🚩 FLAG: onKeyPress (Enter to send) → removed (no keyboard Enter on mobile, use Send button)
// 🚩 FLAG: data-radix-scroll-area-viewport querySelector → scrollViewRef.current?.scrollToEnd()
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Brain, Target, TrendingUp, Clock, Send, MessageCircle, ExternalLink } from "lucide-react-native";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { useContentMode } from "@/context/ContentModeContext";
import { formatCurrencyWithContentMode } from "@/utils/analytics-utils";

interface ShiftBuddyStats {
  totalEarnings: number;
  totalHours: number;
  avgHourly: number;
  shiftsCount: number;
  bestTimesTodayBlocks: string;
  bestTimesTodayBlocksEnhanced: TimeBlock[];
  currentDayName: string;
  weeklyGoal: number;
  currentWeekEarnings: number;
  remainingToGoal: number;
}

interface TimeBlock {
  timeBlock: string;
  hourlyRate: number;
  workDays: number;
  percentage: number;
}

interface PersonaMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const personaModes: PersonaMode[] = [
  { id: "buddy", name: "Buddy Mode", description: "Friendly & encouraging", icon: "😊" },
  { id: "boss", name: "Boss Mode", description: "Strict & results-focused", icon: "👔" },
  { id: "nerd", name: "Nerd Mode", description: "Data-driven analysis", icon: "🤓" },
];

const ShiftBuddy: React.FC = () => {
  const [activeMode, setActiveMode] = useState<string>("boss");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [weeklyReview, setWeeklyReview] = useState("");
  const [dailyPlan, setDailyPlan] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [stats, setStats] = useState<ShiftBuddyStats | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [remainingCalls, setRemainingCalls] = useState(-1);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isContentModeEnabled } = useContentMode();
  const {
    checkFeatureAccess,
    createCheckoutSession,
    useFeature,
    subscriptionTier,
  } = useSubscription();

  // 🚩 FLAG: scrollAreaRef.querySelector() → ScrollView ref with scrollToEnd()
  const scrollViewRef = useRef<ScrollView>(null);

  const getTodayKey = () => new Date().toISOString().split("T")[0];
  const getDailyBriefingKey = (userId: string) => `shiftbuddy_briefing_${userId}_${getTodayKey()}`;
  const getDailyPlanKey = (userId: string) => `shiftbuddy_plan_${userId}_${getTodayKey()}`;
  const getDailyStatsKey = (userId: string) => `shiftbuddy_stats_${userId}_${getTodayKey()}`;

  // 🚩 FLAG: localStorage.setItem → AsyncStorage.setItem (async)
  const saveDailyBriefing = async (content: string) => {
    if (user?.id && content) {
      await AsyncStorage.setItem(getDailyBriefingKey(user.id), content);
    }
  };

  const saveDailyPlan = async (content: string) => {
    if (user?.id && content) {
      await AsyncStorage.setItem(getDailyPlanKey(user.id), content);
    }
  };

  const saveDailyStats = async (statsData: any) => {
    if (user?.id && statsData) {
      await AsyncStorage.setItem(getDailyStatsKey(user.id), JSON.stringify(statsData));
    }
  };

  const loadDailyContent = async () => {
    if (!user?.id) return;

    // 🚩 FLAG: localStorage.getItem → AsyncStorage.getItem (async)
    const savedBriefing = await AsyncStorage.getItem(getDailyBriefingKey(user.id));
    const savedPlan = await AsyncStorage.getItem(getDailyPlanKey(user.id));
    const savedStats = await AsyncStorage.getItem(getDailyStatsKey(user.id));

    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        setStats(parsedStats);
      } catch (error) {
        await loadStats();
      }
    } else {
      await loadStats();
    }

    if (savedBriefing) {
      setBriefing(savedBriefing);
    } else {
      await callShiftBuddyAI("daily-briefing");
    }

    if (savedPlan) {
      setDailyPlan(savedPlan);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    if (user?.id) {
      loadDailyContent();
    }
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (chatMessages.length > 0 && !sessionStart) {
      setSessionStart(new Date());
    }
  }, [chatMessages.length, sessionStart]);

  const logChatInteraction = async (userInput: string, aiResponse: string) => {
    if (!user?.id || !sessionStart) return;
    try {
      const sessionDuration = Math.floor(
        (new Date().getTime() - sessionStart.getTime()) / 1000
      );
      await supabase.from("chat_logs").insert({
        user_id: user.id,
        user_input: userInput,
        ai_response: aiResponse,
        mode: activeMode,
        session_start: sessionStart.toISOString(),
        session_duration_seconds: sessionDuration,
      });
    } catch (error) {
      console.error("Failed to log chat interaction:", error);
    }
  };

  const parseBestTimes = (bestTimesString: string) => {
    if (
      !bestTimesString ||
      bestTimesString === "No data available for today" ||
      bestTimesString === "No data available"
    ) {
      return [];
    }
    try {
      const timeBlocks = bestTimesString
        .split(", ")
        .map((block) => {
          const timeMatch = block.match(/^(\d{2}:\d{2}-\d{2}:\d{2})/);
          const rateMatch = block.match(/\$(\d+\.?\d*)/);
          const daysMatch = block.match(/from (\d+) days?\)/);
          return {
            time: timeMatch ? timeMatch[1] : "",
            hourlyRate: rateMatch ? parseFloat(rateMatch[1]) : 0,
            workDays: daysMatch ? parseInt(daysMatch[1]) : 0,
          };
        })
        .filter((block) => block.time && block.hourlyRate > 0);

      return timeBlocks.sort((a, b) =>
        a.time.split("-")[0].localeCompare(b.time.split("-")[0])
      );
    } catch {
      return [];
    }
  };

  const callShiftBuddyAI = async (requestType: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use ShiftBuddy",
        variant: "destructive",
      });
      return;
    }

    if (subscriptionTier === "pro") {
      const usageResult = await checkFeatureAccess("shiftbuddy_calls_daily");
      if (!usageResult.access) {
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily limit of 5 ShiftBuddy calls. Upgrade to Elite for unlimited access.",
          variant: "destructive",
        });
        return;
      }
    }

    switch (requestType) {
      case "daily-briefing": setBriefingLoading(true); break;
      case "weekly-review": setReviewLoading(true); break;
      case "daily-plan": setPlanLoading(true); break;
      case "suggestions": setSuggestionsLoading(true); break;
    }

    try {
      const { data, error } = await supabase.functions.invoke("shiftbuddy-ai", {
        body: { userId: user.id, mode: activeMode, requestType },
      });

      if (error) throw error;

      if (subscriptionTier === "pro") {
        await useFeature("shiftbuddy_calls_daily");
        const updatedUsage = await checkFeatureAccess("shiftbuddy_calls_daily");
        setRemainingCalls(updatedUsage.remaining_uses || 0);
      }

      const response = data.response;
      setStats(data.stats);
      await saveDailyStats(data.stats);

      switch (requestType) {
        case "daily-briefing":
          setBriefing(response);
          await saveDailyBriefing(response);
          break;
        case "weekly-review": setWeeklyReview(response); break;
        case "daily-plan":
          setDailyPlan(response);
          await saveDailyPlan(response);
          break;
        case "suggestions": setSuggestions(response); break;
      }

      toast({ title: "ShiftBuddy Updated", description: "Your AI assistant has new insights for you!" });
    } catch (error) {
      toast({
        title: "ShiftBuddy Error",
        description: "Failed to get AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      switch (requestType) {
        case "daily-briefing": setBriefingLoading(false); break;
        case "weekly-review": setReviewLoading(false); break;
        case "daily-plan": setPlanLoading(false); break;
        case "suggestions": setSuggestionsLoading(false); break;
      }
    }
  };

  const sendChatMessage = async () => {
    if (!user?.id || !currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("shiftbuddy-ai", {
        body: {
          userId: user.id,
          mode: activeMode,
          requestType: "chat",
          chatMessage: currentMessage,
          chatHistory: chatMessages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setStats(data.stats);

      logChatInteraction(currentMessage, data.response);

      if (data.response.includes("I've updated your weekly goal to")) {
        setTimeout(() => callShiftBuddyAI("daily-briefing"), 500);
      }
    } catch (error) {
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("shiftbuddy-ai", {
        body: { userId: user.id, mode: activeMode, requestType: "stats-only" },
      });
      if (error) throw error;
      if (data.stats) {
        setStats(data.stats);
        await saveDailyStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load ShiftBuddy stats:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDailyContent();
      if (subscriptionTier === "pro") {
        checkFeatureAccess("shiftbuddy_calls_daily").then((result) => {
          setRemainingCalls(result.remaining_uses || 0);
        });
      }
    }
  }, [user?.id, subscriptionTier]);

  const formatAIResponse = (text: string) => {
    if (!text) return text;
    // Mobile line spacing for numbered points
    return text.replace(/(\d+\.\s[^\n]*(?:\n(?!\d+\.)[^\n]*)*)/g, "$1\n");
  };

  // Helper sub-components
  const StatCard = ({
    title,
    value,
    icon,
  }: {
    title: string;
    value: string;
    icon: React.ReactNode;
  }) => (
    <View className="flex-row items-center space-x-2 p-3 bg-gray-50 rounded-lg">
      {icon}
      <View>
        <Text className="text-xs text-gray-600">{title}</Text>
        <Text className="font-semibold text-sm text-foreground">{value}</Text>
      </View>
    </View>
  );

  const BestTimesDisplay = ({
    bestTimesString,
    dayName,
  }: {
    bestTimesString: string;
    dayName: string;
  }) => {
    const enhancedData = stats?.bestTimesTodayBlocksEnhanced;

    if (enhancedData && enhancedData.length > 0) {
      return (
        <View className="bg-blue-50 p-3 rounded-lg">
          <Text className="text-xs font-medium text-blue-800 mb-2">
            Target Time Blocks for {dayName}:
          </Text>
          <View className="space-y-3">
            {enhancedData.map((block, index) => (
              <View key={index} className="bg-white p-2 rounded">
                <Text className="font-medium text-blue-900 text-sm">
                  {block.timeBlock} → ${block.hourlyRate.toFixed(2)}/hr
                </Text>
                <Text className="text-xs text-gray-600 mt-1 ml-2">
                  (
                  <Text
                    className={
                      block.percentage >= 0
                        ? "font-medium text-green-600"
                        : "font-medium text-red-600"
                    }
                  >
                    {block.percentage >= 0 ? "+" : ""}
                    {block.percentage.toFixed(1)}%
                  </Text>{" "}
                  vs seasonal avg)
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    const timeBlocks = parseBestTimes(bestTimesString);

    if (timeBlocks.length === 0) {
      return (
        <View className="bg-gray-50 p-3 rounded-lg">
          <Text className="text-xs font-medium text-gray-800">
            Best times for {dayName}:
          </Text>
          <Text className="text-sm text-gray-600 mt-1">No data available</Text>
        </View>
      );
    }

    return (
      <View className="bg-blue-50 p-3 rounded-lg">
        <Text className="text-xs font-medium text-blue-800 mb-2">
          Target Time Blocks for {dayName}:
        </Text>
        <View className="space-y-3">
          {timeBlocks.map((block, index) => (
            <View key={index} className="bg-white p-2 rounded">
              <Text className="font-medium text-blue-900 text-sm">
                {block.time} → ${block.hourlyRate.toFixed(2)}/hr
              </Text>
              <Text className="text-xs text-gray-600 mt-1 ml-2">
                ({block.workDays} day{block.workDays !== 1 ? "s" : ""})
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <Card className="w-full">
        <CardHeader className="items-center">
          <CardTitle className="flex-row items-center gap-2">
            <Brain size={24} color="#84cc16" />
            <Text className="text-lg font-semibold text-foreground ml-2">ShiftBuddy AI</Text>
          </CardTitle>
          <CardDescription>Please log in to access your AI assistant</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <FeatureGate
      feature="shiftbuddy"
      title="ShiftBuddy AI Assistant"
      description="Get personalized insights, daily briefings, and strategic advice to optimize your gig work."
    >
      <Card className="w-full">
        <CardHeader className="pb-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Brain size={24} color="#84cc16" />
              <View className="ml-2">
                <CardTitle>ShiftBuddy AI</CardTitle>
                <CardDescription>Your AI-powered gig work assistant</CardDescription>
              </View>
            </View>
            {subscriptionTier === "pro" && remainingCalls >= 0 && (
              <View className="items-end space-y-2">
                <Badge variant="outline" className="border-blue-200">
                  {remainingCalls} calls left today
                </Badge>
                <Button
                  size="sm"
                  onPress={async () => {
                    const priceId = "price_1Rlsh906hf9LhstgIbATIaAq";
                    await createCheckoutSession(priceId, "elite");
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-white text-xs">Upgrade to Elite</Text>
                  <ExternalLink size={12} color="#ffffff" />
                </Button>
              </View>
            )}
          </View>

          {/* Persona Mode Selector */}
          <View className="space-y-3">
            <Text className="text-sm font-medium text-gray-700">
              Assistant Mode:
            </Text>
            <View className="gap-2">
              {personaModes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={activeMode === mode.id ? "default" : "outline"}
                  size="sm"
                  onPress={() => setActiveMode(mode.id)}
                  className="flex-row justify-start items-center px-3 py-2"
                >
                  <Text className="mr-2 text-base">{mode.icon}</Text>
                  <View className="items-start">
                    <Text className={`font-medium text-xs ${activeMode === mode.id ? "text-white" : "text-foreground"}`}>
                      {mode.name}
                    </Text>
                    <Text className={`text-xs opacity-75 ${activeMode === mode.id ? "text-white" : "text-foreground"}`}>
                      {mode.description}
                    </Text>
                  </View>
                </Button>
              ))}
            </View>
          </View>

          {/* Stats Overview */}
          {stats && (
            <View className="space-y-3 mt-4">
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    title="Avg Hourly"
                    value={formatCurrencyWithContentMode(stats.avgHourly, isContentModeEnabled)}
                    icon={<TrendingUp size={16} color="#16a34a" />}
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    title="Weekly Goal"
                    value={formatCurrencyWithContentMode(stats.weeklyGoal, isContentModeEnabled)}
                    icon={<Target size={16} color="#2563eb" />}
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    title="This Week"
                    value={formatCurrencyWithContentMode(stats.currentWeekEarnings, isContentModeEnabled)}
                    icon={<Clock size={16} color="#ea580c" />}
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
                  <StatCard
                    title="Remaining"
                    value={formatCurrencyWithContentMode(stats.remainingToGoal, isContentModeEnabled)}
                    icon={<Brain size={16} color="#9333ea" />}
                  />
                </View>
              </View>

              {stats.currentDayName && (
                <BestTimesDisplay
                  bestTimesString={stats.bestTimesTodayBlocks}
                  dayName={stats.currentDayName}
                />
              )}
            </View>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs defaultValue="briefing">
            <TabsList className="mb-4">
              <TabsTrigger value="briefing">Briefing</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
              <TabsTrigger value="advice">Advice</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            {/* Briefing Tab */}
            <TabsContent value="briefing" className="space-y-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground">Daily Briefing</Text>
                <Button
                  onPress={() => callShiftBuddyAI("daily-briefing")}
                  disabled={briefingLoading}
                  size="sm"
                  variant="outline"
                >
                  {briefingLoading ? (
                    <ActivityIndicator size="small" color="#84cc16" />
                  ) : briefing ? (
                    "Refresh"
                  ) : (
                    "Generate"
                  )}
                </Button>
              </View>

              <Text className="text-sm text-gray-600 leading-relaxed">
                Get your personalized daily briefing with insights, earnings analysis, and optimization tips.
              </Text>

              {briefing && (
                <View className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <Text className="text-sm leading-relaxed text-foreground">
                    {formatAIResponse(briefing)}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between mt-6">
                <Text className="text-base font-medium text-foreground">Today's Action Plan</Text>
                <Button
                  onPress={() => callShiftBuddyAI("daily-plan")}
                  disabled={planLoading}
                  size="sm"
                  variant="outline"
                >
                  {planLoading ? (
                    <ActivityIndicator size="small" color="#84cc16" />
                  ) : dailyPlan ? (
                    "Refresh"
                  ) : (
                    "Generate"
                  )}
                </Button>
              </View>

              {dailyPlan && (
                <View className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <Text className="font-semibold text-green-800 mb-2 text-sm">
                    ✅ Today's Action Plan -{" "}
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {formatAIResponse(dailyPlan)}
                  </Text>
                </View>
              )}
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review" className="space-y-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground">Weekly Review</Text>
                <Button
                  onPress={() => callShiftBuddyAI("weekly-review")}
                  disabled={reviewLoading}
                  size="sm"
                  variant="outline"
                >
                  {reviewLoading ? <ActivityIndicator size="small" color="#84cc16" /> : "Generate"}
                </Button>
              </View>
              <View className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                <Text className="text-sm leading-relaxed text-foreground">
                  {formatAIResponse(weeklyReview) ||
                    'Click "Generate" to get your weekly performance analysis...'}
                </Text>
              </View>
            </TabsContent>

            {/* Advice Tab */}
            <TabsContent value="advice" className="space-y-4">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-lg font-semibold text-foreground">Personalized Advice</Text>
                <Badge variant="secondary">
                  {personaModes.find((p) => p.id === activeMode)?.description}
                </Badge>
              </View>

              <Text className="text-sm text-gray-600 leading-relaxed">
                Get personalized advice based on your shift performance data and selected assistant mode.
              </Text>

              <Button
                onPress={() => callShiftBuddyAI("suggestions")}
                disabled={suggestionsLoading}
                className="w-full flex-row items-center gap-2"
                variant="secondary"
              >
                {suggestionsLoading ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : null}
                <Text className="text-foreground text-sm">
                  {suggestionsLoading ? "Loading..." : "Get 3 Actionable Tips"}
                </Text>
              </Button>

              {suggestions && (
                <View className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <Text className="font-semibold text-orange-800 mb-2 text-sm">
                    Personalized Suggestions
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {formatAIResponse(suggestions)}
                  </Text>
                </View>
              )}
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4">
              <FeatureGate
                feature="shiftbuddy_chat"
                requiredTier="elite"
                title="Elite Chat Feature"
                description="Interactive chat with your AI coach for creative data analysis and personalized strategies. Upgrade to Elite for unlimited AI conversations."
                fallback={
                  <View className="items-center py-8 space-y-4">
                    <MessageCircle size={48} color="#9ca3af" />
                    <View className="items-center">
                      <Text className="text-lg font-semibold text-gray-700">
                        Elite Feature: Interactive AI Chat
                      </Text>
                      <Text className="text-sm text-gray-500 mt-2 text-center">
                        Chat directly with your ShiftBuddy AI for creative data insights, goal setting, and strategic advice.
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1">
                        Available with Elite subscription
                      </Text>
                      <Button
                        onPress={async () => {
                          const priceId = "price_1Rlsh906hf9LhstgIbATIaAq";
                          await createCheckoutSession(priceId, "elite");
                        }}
                        className="mt-4 flex-row items-center gap-2"
                        size="lg"
                      >
                        <Text className="text-white">Upgrade to Elite</Text>
                        <ExternalLink size={16} color="#ffffff" />
                      </Button>
                    </View>
                  </View>
                }
              >
                <View className="flex-row items-center gap-2 mb-4">
                  <MessageCircle size={20} color="#84cc16" />
                  <Text className="text-lg font-semibold text-foreground">Chat with ShiftBuddy</Text>
                </View>

                <View className="space-y-4">
                  {/* 🚩 FLAG: ScrollArea → ScrollView with ref */}
                  <ScrollView
                    ref={scrollViewRef}
                    className="h-96 border border-border rounded-lg p-4"
                    onContentSizeChange={scrollToBottom}
                  >
                    {chatMessages.length === 0 ? (
                      <View className="items-center py-8">
                        <MessageCircle size={32} color="#9ca3af" />
                        <Text className="text-sm text-gray-500 mt-2 text-center">
                          Start a conversation with your ShiftBuddy!
                        </Text>
                        <Text className="text-xs text-gray-400 mt-1 text-center">
                          Ask about your goals, analyze your data, or get strategic advice.
                        </Text>
                      </View>
                    ) : (
                      <View className="space-y-4">
                        {chatMessages.map((message, index) => (
                          <View
                            key={index}
                            className={`flex-row ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <View
                              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                message.role === "user"
                                  ? "bg-primary"
                                  : "bg-gray-100"
                              }`}
                            >
                              <Text
                                className={`text-sm ${
                                  message.role === "user"
                                    ? "text-white"
                                    : "text-gray-800"
                                }`}
                              >
                                {message.content}
                              </Text>
                              <Text
                                className={`text-xs opacity-70 mt-1 ${
                                  message.role === "user" ? "text-white" : "text-gray-600"
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString()}
                              </Text>
                            </View>
                          </View>
                        ))}
                        {chatLoading && (
                          <View className="flex-row justify-start">
                            <View className="bg-gray-100 rounded-lg px-3 py-2">
                              <ActivityIndicator size="small" color="#84cc16" />
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>

                  {/* 🚩 FLAG: Textarea + onKeyPress(Enter) → TextInput multiline + Send button */}
                  <View className="flex-row gap-2">
                    <TextInput
                      value={currentMessage}
                      onChangeText={setCurrentMessage}
                      placeholder="Ask about your goals, data, or get advice..."
                      editable={!chatLoading}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background min-h-[80px] max-h-48"
                      placeholderTextColor="#9ca3af"
                    />
                    <Button
                      onPress={sendChatMessage}
                      disabled={!currentMessage.trim() || chatLoading}
                      size="icon"
                    >
                      {chatLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Send size={16} color="#ffffff" />
                      )}
                    </Button>
                  </View>
                </View>
              </FeatureGate>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </FeatureGate>
  );
};

export default ShiftBuddy;
