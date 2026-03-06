// 🚩 FLAG: Radix Slider → @react-native-community/slider (must be installed: npx expo install @react-native-community/slider)
// 🚩 FLAG: Dialog → native Modal via our Dialog shim
// 🚩 FLAG: <div> → <View>; <span> → <Text>; e.target.value → direct value from onChangeText
import React, { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, Battery, AlertTriangle, Save } from "lucide-react-native";

interface WellnessData {
  moodScore: number;
  energyLevel: number;
  stressLevel: number;
  wellnessNotes: string;
}

interface WellnessCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wellnessData: WellnessData) => Promise<void>;
  isLoading?: boolean;
}

const getMoodLabel = (score: number) => {
  if (score <= 2) return "Very Low";
  if (score <= 4) return "Low";
  if (score <= 6) return "Neutral";
  if (score <= 8) return "Good";
  return "Excellent";
};

const getEnergyLabel = (level: number) => {
  if (level <= 2) return "Exhausted";
  if (level <= 4) return "Tired";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "Energetic";
  return "Very Energetic";
};

const getStressLabel = (level: number) => {
  if (level <= 2) return "Very Low";
  if (level <= 4) return "Low";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "High";
  return "Very High";
};

const WellnessCheckIn: React.FC<WellnessCheckInProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [moodScore, setMoodScore] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(3);
  const [wellnessNotes, setWellnessNotes] = useState("");

  const handleSave = async () => {
    await onSave({
      moodScore,
      energyLevel,
      stressLevel,
      wellnessNotes: wellnessNotes.trim(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <View className="flex-row items-center gap-2">
            <Heart size={20} color="#ef4444" />
            <DialogTitle>Wellness Check-In</DialogTitle>
          </View>
          <DialogDescription>
            How are you feeling after this shift? This helps track your wellbeing over time.
          </DialogDescription>
        </DialogHeader>

        <View className="space-y-6 py-4">
          {/* Mood */}
          <View className="space-y-2">
            <View className="flex-row items-center gap-2">
              <Heart size={16} color="#ec4899" />
              <Label>Mood: {getMoodLabel(moodScore)} ({moodScore}/10)</Label>
            </View>
            <Slider
              value={moodScore}
              onValueChange={(v) => setMoodScore(Math.round(v))}
              minimumValue={1}
              maximumValue={10}
              step={1}
              minimumTrackTintColor="#22c55e"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#22c55e"
            />
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">Very Low</Text>
              <Text className="text-xs text-muted-foreground">Excellent</Text>
            </View>
          </View>

          {/* Energy */}
          <View className="space-y-2">
            <View className="flex-row items-center gap-2">
              <Battery size={16} color="#3b82f6" />
              <Label>Energy: {getEnergyLabel(energyLevel)} ({energyLevel}/10)</Label>
            </View>
            <Slider
              value={energyLevel}
              onValueChange={(v) => setEnergyLevel(Math.round(v))}
              minimumValue={1}
              maximumValue={10}
              step={1}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#3b82f6"
            />
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">Exhausted</Text>
              <Text className="text-xs text-muted-foreground">Very Energetic</Text>
            </View>
          </View>

          {/* Stress */}
          <View className="space-y-2">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={16} color="#f97316" />
              <Label>Stress: {getStressLabel(stressLevel)} ({stressLevel}/10)</Label>
            </View>
            <Slider
              value={stressLevel}
              onValueChange={(v) => setStressLevel(Math.round(v))}
              minimumValue={1}
              maximumValue={10}
              step={1}
              minimumTrackTintColor="#ef4444"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#ef4444"
            />
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">Very Low</Text>
              <Text className="text-xs text-muted-foreground">Very High</Text>
            </View>
          </View>

          {/* Notes */}
          <View className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              placeholder="How did this shift make you feel? Any concerns or highlights?"
              value={wellnessNotes}
              onChangeText={setWellnessNotes}
              maxLength={500}
            />
            <Text className="text-xs text-muted-foreground text-right">
              {wellnessNotes.length}/500
            </Text>
          </View>
        </View>

        <View className="flex-row justify-end gap-2">
          <Button variant="outline" onPress={onClose} disabled={isLoading}>
            Skip
          </Button>
          <Button onPress={handleSave} disabled={isLoading} className="bg-green-600">
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white text-sm">Saving...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Save size={16} color="#ffffff" />
                <Text className="text-white text-sm font-medium">Save Check-In</Text>
              </View>
            )}
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessCheckIn;
