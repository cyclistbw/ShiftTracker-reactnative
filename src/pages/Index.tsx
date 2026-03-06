// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: Dialog -> Modal with TouchableWithoutFeedback overlay + KeyboardAvoidingView
// 🚩 FLAG: toast from sonner -> toast from @/hooks/use-toast
// 🚩 FLAG: ScrollArea -> ScrollView
// 🚩 FLAG: Checkbox -> Switch
// 🚩 FLAG: Textarea -> TextInput multiline
// 🚩 FLAG: e.target.value -> onChangeText; type="number" -> keyboardType="numeric"/"decimal-pad"
// 🚩 FLAG: onClick -> onPress
// 🚩 FLAG: traceDialogClose debug function -> direct setState calls
// 🚩 FLAG: <div hidden> -> style={{ display: "none" }} -> not needed; LocationTracker kept
// 🚩 FLAG: fixed inset-0 -> flex-1; bottom-20 datetime -> SafeAreaView positioning
import { useState, useEffect } from "react";
import {
  View, Text, Modal, ScrollView, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from "react-native";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ShiftButton from "@/components/ShiftButton";
import ExpenseForm from "@/components/ExpenseForm";
import ShiftSummary from "@/components/ShiftSummary";
import PlatformSelector from "@/components/PlatformSelector";
import { saveCurrentShift, getCurrentShift, getShifts, saveShifts } from "@/lib/storage";
import { syncShiftToSupabase } from "@/lib/supabase-functions";
import { Shift, Expense } from "@/types/shift";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react-native";
import LocationTracker from "@/components/LocationTracker";
import WellnessCheckIn from "@/components/WellnessCheckIn";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import useLocationTracking from "@/hooks/useLocationTracking";
import { emergencyStorageCleanup } from "@/lib/storage-cleanup";
import { useSubscription } from "@/context/SubscriptionContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const Index = () => {
  const { settings: businessSettings, loading: businessSettingsLoading, saveSettings } = useBusinessSettings();
  const { getTotalDistanceMiles, tracking, locations, restoreTrackingIfNeeded } = useLocationTracking();
  const { canAccessFeature } = useSubscription();
  const { trackEvent } = useActivityTracker();
  const { toast } = useToast();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);
  const [startShiftDialogOpen, setStartShiftDialogOpen] = useState(false);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTime, setPauseTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [formattedDuration, setFormattedDuration] = useState<string>("");
  const [syncingShift, setSyncingShift] = useState(false);
  const [currentGpsMileage, setCurrentGpsMileage] = useState<number>(0);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [wellnessCheckInOpen, setWellnessCheckInOpen] = useState(false);
  const [pendingShiftData, setPendingShiftData] = useState<any>(null);

  const [startMileage, setStartMileage] = useState<string>("");
  const [endMileage, setEndMileage] = useState<string>("");
  const [income, setIncome] = useState<string>("");
  const [isMileageOnly, setIsMileageOnly] = useState(false);
  const [shiftNotes, setShiftNotes] = useState<string>("");
  const [tasksCompleted, setTasksCompleted] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const useGpsTracking = businessSettings?.mileageCalculationMethod === "gps_tracking";
  const skipOdometer = useGpsTracking;

  useEffect(() => {
    const updateDateTime = () => {
      const timezone = businessSettings?.timezone || "America/New_York";
      const clockFormat = businessSettings?.clockFormat || "12-hour";
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone, month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: clockFormat === "12-hour"
      });
      setCurrentDateTime(formatter.format(now));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, [businessSettings?.timezone, businessSettings?.clockFormat]);

  useEffect(() => {
    if (useGpsTracking && tracking && locations.length > 0) {
      setCurrentGpsMileage(getTotalDistanceMiles());
    } else if (!tracking) {
      setCurrentGpsMileage(0);
    }
  }, [locations, tracking, useGpsTracking, getTotalDistanceMiles]);

  useEffect(() => {
    const loadShift = async () => {
      const shift = await getCurrentShift();
      if (shift) {
        setCurrentShift(shift);
        setExpenses(shift.expenses);
        setIsPaused(shift.isPaused || false);
        setTotalPausedTime(shift.totalPausedTime || 0);
        if (shift.pauseTime) setPauseTime(new Date(shift.pauseTime));
      }
    };
    loadShift();
  }, []);

  useEffect(() => {
    if (currentShift && !businessSettingsLoading && useGpsTracking) {
      restoreTrackingIfNeeded(!!currentShift && !isPaused, useGpsTracking);
    }
  }, [currentShift, isPaused, useGpsTracking, businessSettingsLoading, restoreTrackingIfNeeded]);

  useEffect(() => {
    if (!currentShift) return;
    const calculateDuration = () => {
      const now = new Date();
      let elapsedTime = now.getTime() - new Date(currentShift.startTime).getTime();
      elapsedTime -= currentShift.totalPausedTime || 0;
      if (isPaused && pauseTime) elapsedTime -= now.getTime() - pauseTime.getTime();
      const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
      setFormattedDuration(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    calculateDuration();
    const intervalId = setInterval(calculateDuration, 1000);
    return () => clearInterval(intervalId);
  }, [currentShift, isPaused, pauseTime, totalPausedTime]);

  const handleStartShift = async () => {
    if (!skipOdometer && !isMileageOnly && (!startMileage || isNaN(parseFloat(startMileage)))) {
      toast({ title: "Please enter your starting odometer reading", variant: "destructive" });
      return;
    }
    const newShift: Shift = {
      id: uuidv4(), startTime: new Date(), endTime: null,
      mileageStart: skipOdometer ? 0 : parseFloat(startMileage),
      mileageEnd: null, income: isMileageOnly ? 0 : null,
      expenses: [], isActive: true, locations: [],
      isPaused: false, totalPausedTime: 0, isMileageOnly
    };
    setCurrentShift(newShift); setExpenses([]); setIsPaused(false);
    setTotalPausedTime(0); setPauseTime(null);
    await saveCurrentShift(newShift); setStartShiftDialogOpen(false); setIsMileageOnly(false);
    const methodText = useGpsTracking ? " GPS tracking will calculate mileage automatically." : "";
    toast({ title: (isMileageOnly ? "Mileage tracking started!" : "Shift started!") + methodText });
    trackEvent("shift_start", "dashboard", { mileageOnly: isMileageOnly, gpsTracking: useGpsTracking });
  };

  const handlePauseShift = async () => {
    if (!currentShift) return;
    if (isPaused) {
      const now = new Date();
      const updatedTotalPausedTime = totalPausedTime + (pauseTime ? now.getTime() - pauseTime.getTime() : 0);
      const updatedShift = { ...currentShift, isPaused: false, pauseTime: null, totalPausedTime: updatedTotalPausedTime };
      setCurrentShift(updatedShift); setIsPaused(false); setPauseTime(null);
      setTotalPausedTime(updatedTotalPausedTime); await saveCurrentShift(updatedShift);
      toast({ title: "Shift resumed" });
    } else {
      const now = new Date();
      const updatedShift = { ...currentShift, isPaused: true, pauseTime: now };
      setCurrentShift(updatedShift); setIsPaused(true); setPauseTime(now);
      await saveCurrentShift(updatedShift); toast({ title: "Shift paused" });
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;
    if (!currentShift.isMileageOnly && (!income || isNaN(parseFloat(income)))) {
      toast({ title: "Please enter your income for this shift", variant: "destructive" }); return;
    }
    let finalMileageEnd = 0;
    if (useGpsTracking) {
      finalMileageEnd = currentShift.mileageStart! + currentGpsMileage;
    } else if (!skipOdometer) {
      if (!endMileage || isNaN(parseFloat(endMileage))) {
        toast({ title: "Please enter your ending odometer reading", variant: "destructive" }); return;
      }
      if (parseFloat(endMileage) < currentShift.mileageStart!) {
        toast({ title: "Ending mileage cannot be less than starting mileage", variant: "destructive" }); return;
      }
      finalMileageEnd = parseFloat(endMileage);
    }
    let finalTotalPausedTime = totalPausedTime;
    if (isPaused && pauseTime) finalTotalPausedTime += (new Date().getTime() - pauseTime.getTime());
    const completedShift: Shift = {
      ...currentShift, endTime: new Date(), mileageEnd: finalMileageEnd,
      income: currentShift.isMileageOnly ? 0 : parseFloat(income),
      isActive: false, isPaused: false, totalPausedTime: finalTotalPausedTime,
      tasksCompleted: currentShift.isMileageOnly ? 0 : (tasksCompleted ? parseInt(tasksCompleted) : 0),
      platform: selectedPlatforms.length > 0 ? selectedPlatforms.join(", ") : undefined,
      ...(currentShift.isMileageOnly && shiftNotes && { notes: shiftNotes }),
      ...(!currentShift.isMileageOnly && pendingShiftData?.wellnessData && {
        moodScore: pendingShiftData.wellnessData.moodScore,
        energyLevel: pendingShiftData.wellnessData.energyLevel,
        stressLevel: pendingShiftData.wellnessData.stressLevel,
        wellnessNotes: pendingShiftData.wellnessData.wellnessNotes,
        wellnessCheckedInAt: pendingShiftData.wellnessCheckedInAt
      })
    };
    const shifts = await getShifts();
    await saveShifts([...shifts, completedShift]);
    setCurrentShift(null); await saveCurrentShift(null); setEndShiftDialogOpen(false);
    setPendingShiftData(null); setIsPaused(false); setPauseTime(null);
    setTotalPausedTime(0); setCurrentGpsMileage(0); setSelectedPlatforms([]);
    trackEvent("shift_end", "dashboard", { mileageOnly: completedShift.isMileageOnly });
    setSyncingShift(true);
    try {
      const result = await syncShiftToSupabase(completedShift);
      if (result.success) {
        toast({ title: "Shift completed and synced to cloud storage!" });
      } else {
        toast({ title: "Shift completed but sync failed. Your shift is saved locally.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Shift completed but sync failed. Your shift is saved locally.", variant: "destructive" });
    } finally { setSyncingShift(false); }
  };

  const promptStartShift = async () => {
    if (businessSettingsLoading) { toast({ title: "Loading settings, please wait...", variant: "destructive" }); return; }
    if (skipOdometer && !isMileageOnly) {
      const newShift: Shift = {
        id: uuidv4(), startTime: new Date(), endTime: null, mileageStart: 0,
        mileageEnd: null, income: null, expenses: [], isActive: true,
        locations: [], isPaused: false, totalPausedTime: 0
      };
      setCurrentShift(newShift); setExpenses([]); setIsPaused(false);
      setTotalPausedTime(0); setPauseTime(null); await saveCurrentShift(newShift);
      toast({ title: "Shift started! GPS tracking will calculate mileage automatically." });
      trackEvent("shift_start", "dashboard", { gpsTracking: true });
    } else {
      setStartMileage(""); setStartShiftDialogOpen(true);
    }
  };

  const promptEndShift = () => {
    if (!currentShift) return;
    if (!currentShift.isMileageOnly && businessSettings?.enableWellnessCheckin) {
      setWellnessCheckInOpen(true);
    } else {
      setEndMileage(""); setIncome(""); setShiftNotes(""); setTasksCompleted("");
      setSelectedPlatforms([]); setEndShiftDialogOpen(true);
    }
  };

  const handleWellnessCheckIn = async (wellnessData: { moodScore: number; energyLevel: number; stressLevel: number; wellnessNotes: string }) => {
    setPendingShiftData({ wellnessData, wellnessCheckedInAt: new Date().toISOString() });
    setWellnessCheckInOpen(false);
    setEndMileage(""); setIncome(""); setShiftNotes(""); setTasksCompleted("");
    setSelectedPlatforms([]); setEndShiftDialogOpen(true);
  };

  const handleWellnessSkip = () => {
    setPendingShiftData(null); setWellnessCheckInOpen(false);
    setEndMileage(""); setIncome(""); setShiftNotes(""); setTasksCompleted("");
    setSelectedPlatforms([]); setEndShiftDialogOpen(true);
  };

  const handleSaveNewPlatform = async (platform: string) => {
    if (!businessSettings || !platform.trim()) return;
    const currentPlatforms = businessSettings.gigPlatforms || [];
    if (currentPlatforms.some(p => p.toLowerCase() === platform.trim().toLowerCase())) return;
    try {
      await saveSettings({ ...businessSettings, gigPlatforms: [...currentPlatforms, platform.trim()] });
      toast({ title: platform + " added to your saved platforms" });
    } catch (error) { console.error("Error saving new platform:", error); }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, "id" | "timestamp">) => {
    if (!currentShift) {
      const storedShift = await getCurrentShift();
      if (storedShift && storedShift.isActive) {
        setCurrentShift(storedShift); setExpenses(storedShift.expenses);
      } else {
        toast({ title: "Please start a shift first before adding expenses.", variant: "destructive" });
        throw new Error("No active shift found");
      }
    }
    const newExpense: Expense = { ...expenseData, receiptImage: undefined, id: uuidv4(), timestamp: new Date() };
    try {
      const { saveExpenseToDatabase } = await import("@/lib/expense-storage");
      const shiftToUse = currentShift || getCurrentShift();
      if (!shiftToUse) throw new Error("Current shift lost during expense processing");
      const result = await saveExpenseToDatabase(expenseData, shiftToUse.id);
      if (!result.success) throw new Error(result.error || "Failed to save expense to database");
      const updatedExpenses = [...expenses, newExpense];
      setExpenses(updatedExpenses);
      const updatedShift = { ...shiftToUse, expenses: updatedExpenses };
      setCurrentShift(updatedShift); await saveCurrentShift(updatedShift);
      toast({ title: "Expense added and saved successfully" });
      setAddExpenseDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("quota") || errorMessage.includes("Storage")) {
        emergencyStorageCleanup();
        toast({ title: "Storage full. Please try adding the expense again.", variant: "destructive" });
      } else {
        toast({ title: "Failed to save expense: " + errorMessage, variant: "destructive" });
      }
      throw error;
    }
  };

  const handleLocationUpdate = (locs: any[]) => {
    if (currentShift) {
      const updatedShift = { ...currentShift, locations: locs };
      setCurrentShift(updatedShift); saveCurrentShift(updatedShift);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Modal visible={startShiftDialogOpen} transparent animationType="slide" onRequestClose={() => setStartShiftDialogOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setStartShiftDialogOpen(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="bg-background rounded-t-2xl border-t border-border">
                  <View className="px-4 pt-4 pb-2 border-b border-border">
                    <Text className="text-lg font-semibold text-foreground">
                      {isMileageOnly ? "Start Mileage Tracking" : "Start New Shift"}
                    </Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                      {isMileageOnly ? "Track mileage for errands without time or income tracking." : "Enter your current odometer reading to start tracking your shift."}
                    </Text>
                  </View>
                  <View className="px-4 py-4 space-y-4">
                    <View className="flex-row items-center justify-between">
                      <Label>Mileage only (no time/income tracking)</Label>
                      <Switch checked={isMileageOnly} onCheckedChange={(c) => setIsMileageOnly(c)} />
                    </View>
                    {!skipOdometer && (
                      <View>
                        <Label className="mb-1">Starting Odometer Reading (miles)</Label>
                        <TextInput className="border border-border rounded-md px-3 py-2 text-foreground bg-background mt-1" placeholder="Enter your current odometer reading" keyboardType="numeric" value={startMileage} onChangeText={setStartMileage} />
                      </View>
                    )}
                  </View>
                  <View className="flex-row justify-end gap-2 px-4 py-3 border-t border-border">
                    <Button variant="outline" onPress={() => setStartShiftDialogOpen(false)}>Cancel</Button>
                    <Button onPress={handleStartShift}>{isMileageOnly ? "Start Tracking" : "Start Shift"}</Button>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={endShiftDialogOpen} transparent animationType="slide" onRequestClose={() => setEndShiftDialogOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setEndShiftDialogOpen(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="bg-background rounded-t-2xl border-t border-border" style={{ maxHeight: "90%" }}>
                  <View className="px-4 pt-4 pb-2 border-b border-border">
                    <Text className="text-lg font-semibold text-foreground">
                      {currentShift?.isMileageOnly ? "End Tracking" : "End Shift"}
                    </Text>
                    {!currentShift?.isMileageOnly && isPaused && formattedDuration && (
                      <Text className="text-sm font-medium text-amber-700 mt-1">Duration: {formattedDuration}</Text>
                    )}
                  </View>
                  <ScrollView className="px-4" keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                    <View className="py-4 space-y-4">
                      {currentShift && !skipOdometer && (
                        <View className="bg-muted p-3 rounded-md border border-border">
                          <Text className="text-sm text-foreground">Starting mileage: {currentShift.mileageStart?.toFixed(2)} miles</Text>
                        </View>
                      )}
                      {useGpsTracking && currentShift && (
                        <View className="bg-muted p-3 rounded-md border border-border">
                          <Text className="text-sm font-medium text-foreground">GPS Tracking Enabled</Text>
                          <Text className="text-sm text-foreground">GPS mileage: {(Math.round(currentGpsMileage * 100) / 100).toFixed(2)} miles</Text>
                        </View>
                      )}
                      {!skipOdometer && (
                        <View>
                          <Label className="mb-1">Ending Odometer Reading (miles)</Label>
                          <TextInput className="border border-border rounded-md px-3 py-2 text-foreground bg-background mt-1" placeholder="Enter your current odometer reading" keyboardType="numeric" value={endMileage} onChangeText={setEndMileage} />
                        </View>
                      )}
                      {currentShift?.isMileageOnly && (
                        <View>
                          <Label className="mb-1">Notes (optional)</Label>
                          <TextInput className="border border-border rounded-md px-3 py-2 text-foreground bg-background mt-1" placeholder="Add notes about your trip" value={shiftNotes} onChangeText={setShiftNotes} multiline numberOfLines={3} style={{ minHeight: 72, textAlignVertical: "top" }} />
                        </View>
                      )}
                      {!currentShift?.isMileageOnly && (
                        <>
                          <View>
                            <Label className="mb-1">Income Earned ($)</Label>
                            <TextInput className="border border-border rounded-md px-3 py-2 text-foreground bg-background mt-1" placeholder="Enter your income for this shift" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
                          </View>
                          <View>
                            <Label className="mb-1">Tasks/Trips (optional)</Label>
                            <TextInput className="border border-border rounded-md px-3 py-2 text-foreground bg-background mt-1" placeholder="Enter number of tasks/trips completed" keyboardType="numeric" value={tasksCompleted} onChangeText={setTasksCompleted} />
                          </View>
                          <PlatformSelector selectedPlatforms={selectedPlatforms} onPlatformsChange={setSelectedPlatforms} savedPlatforms={businessSettings?.gigPlatforms || []} onSaveNewPlatform={handleSaveNewPlatform} />
                        </>
                      )}
                    </View>
                  </ScrollView>
                  <View className="flex-row gap-2 px-4 py-3 border-t border-border">
                    <Button variant="outline" onPress={() => setEndShiftDialogOpen(false)} className="flex-1 bg-lime-500">Cancel</Button>
                    <Button variant="outline" onPress={() => setAddExpenseDialogOpen(true)} className="flex-1 bg-blue-500 flex-row items-center gap-1">
                      <Plus size={16} color="white" />
                    </Button>
                    <Button onPress={handleEndShift} disabled={syncingShift} className="flex-1 bg-red-500">
                      {syncingShift ? "Saving..." : currentShift?.isMileageOnly ? "End Tracking" : "End Shift"}
                    </Button>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={addExpenseDialogOpen} transparent animationType="slide" onRequestClose={() => setAddExpenseDialogOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setAddExpenseDialogOpen(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="bg-background rounded-t-2xl border-t border-border">
                  <View className="px-4 pt-4 pb-2 border-b border-border">
                    <Text className="text-lg font-semibold text-foreground">Add Expense</Text>
                    <Text className="text-sm text-muted-foreground mt-1">Record an expense during your shift.</Text>
                  </View>
                  <ScrollView className="px-4" style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                    <View className="py-4">
                      <ExpenseForm onAddExpense={handleAddExpense} />
                    </View>
                  </ScrollView>
                  <View className="flex-row justify-end px-4 py-3 border-t border-border">
                    <Button variant="outline" onPress={() => setAddExpenseDialogOpen(false)}>Cancel</Button>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <WellnessCheckIn isOpen={wellnessCheckInOpen} onClose={handleWellnessSkip} onSave={handleWellnessCheckIn} />

      <View className="flex-1 items-center justify-center">
        <ShiftButton isActive={!!currentShift} isPaused={isPaused} onStart={promptStartShift} onEnd={promptEndShift} onPause={handlePauseShift} isMileageOnly={currentShift?.isMileageOnly || false} />
        <View className="mt-6 items-center space-y-2">
          {currentShift ? (
            <>
              <Text className={isPaused ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-lime-600"}>
                {currentShift.isMileageOnly ? "Mileage tracking in progress" : isPaused ? "Shift paused" : "Shift in progress"}
              </Text>
              {!currentShift.isMileageOnly && (
                <Text className="text-foreground font-medium">Duration: {formattedDuration}</Text>
              )}
              <Text className="text-muted-foreground text-sm">
                Starting mileage: {useGpsTracking ? "0.00" : (currentShift.mileageStart?.toFixed(2) || "0.00")} miles
              </Text>
            </>
          ) : (
            <Text className="text-muted-foreground text-sm">No active shift</Text>
          )}
        </View>
        {currentShift && (
          <View className="mt-8 items-center space-y-3">
            <Button onPress={() => setAddExpenseDialogOpen(true)} variant="secondary" size="sm" className="bg-lime-600 flex-row items-center">
              <Plus size={16} color="white" />
              <Text className="text-white ml-2">Add Expense</Text>
            </Button>
            <Button onPress={promptEndShift} variant="destructive" size="sm">
              {currentShift.isMileageOnly ? "End Tracking" : "End Shift"}
            </Button>
          </View>
        )}
        <View style={{ display: "none" }}>
          <LocationTracker isShiftActive={!!currentShift && !isPaused} onLocationUpdate={handleLocationUpdate} />
        </View>
      </View>

      {currentDateTime && (
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <View className="bg-card border border-border rounded-lg px-3 py-2">
            <Text className="text-xs text-muted-foreground font-mono">{currentDateTime}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default Index;
