// 🚩 FLAG: Form/FormField/FormItem/FormLabel/FormMessage → Controller + plain View/Text/Label
// 🚩 FLAG: <form onSubmit> → onPress handler; <input type="datetime-local"> → plain TextInput
// 🚩 FLAG: overflow-y-auto → ScrollView
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shift } from "@/types/shift";
import { format } from "date-fns";
import PlatformSelector from "@/components/PlatformSelector";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export interface ShiftFormValues {
  mileageStart: string;
  mileageEnd: string;
  income: string;
  startTime: string;
  endTime: string;
  tasksCompleted: string;
  platforms: string[];
}

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  onSave: (values: ShiftFormValues) => Promise<void>;
  saving: boolean;
}

const EditShiftDialog = ({ open, onOpenChange, shift, onSave, saving }: EditShiftDialogProps) => {
  const { settings: businessSettings, saveSettings } = useBusinessSettings();

  const { control, handleSubmit, reset } = useForm<ShiftFormValues>({
    defaultValues: {
      mileageStart: "",
      mileageEnd: "",
      income: "",
      startTime: "",
      endTime: "",
      tasksCompleted: "",
      platforms: [],
    },
  });

  React.useEffect(() => {
    if (shift) {
      reset({
        mileageStart: shift.mileageStart?.toString() || "",
        mileageEnd: shift.mileageEnd?.toString() || "",
        income: shift.income?.toString() || "",
        startTime: format(shift.startTime, "yyyy-MM-dd'T'HH:mm"),
        endTime: shift.endTime ? format(shift.endTime, "yyyy-MM-dd'T'HH:mm") : "",
        tasksCompleted: shift.tasksCompleted?.toString() || "",
        platforms: shift.platform ? shift.platform.split(", ").map((p) => p.trim()) : [],
      });
    }
  }, [shift, reset]);

  const handleSaveNewPlatform = async (platform: string) => {
    if (!businessSettings || !platform.trim()) return;
    const currentPlatforms = businessSettings.gigPlatforms || [];
    if (currentPlatforms.some((p) => p.toLowerCase() === platform.trim().toLowerCase())) return;
    try {
      await saveSettings({ ...businessSettings, gigPlatforms: [...currentPlatforms, platform.trim()] });
    } catch (error) {
      console.error("Error saving new platform:", error);
    }
  };

  const handleSubmitForm = async (values: ShiftFormValues) => {
    try {
      await onSave(values);
    } catch (error) {
      console.error("EditShiftDialog: onSave failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
        </DialogHeader>

        <ScrollView>
          <View className="space-y-4">
            {/* Start & End Time */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Label>Start Time</Label>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    // 🚩 FLAG: type="datetime-local" → plain text input (format: yyyy-MM-dd'T'HH:mm)
                    // A full DateTimePicker would use @react-native-community/datetimepicker
                    <Input
                      placeholder="YYYY-MM-DDTHH:MM"
                      value={field.value}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Label>End Time</Label>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <Input
                      placeholder="YYYY-MM-DDTHH:MM"
                      value={field.value}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </View>
            </View>

            {/* Mileage */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Label>Starting Mileage</Label>
                <Controller
                  control={control}
                  name="mileageStart"
                  render={({ field }) => (
                    <Input placeholder="Starting mileage" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
                  )}
                />
              </View>
              <View className="flex-1">
                <Label>Ending Mileage</Label>
                <Controller
                  control={control}
                  name="mileageEnd"
                  render={({ field }) => (
                    <Input placeholder="Ending mileage" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
                  )}
                />
              </View>
            </View>

            {/* Income & Tasks */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Label>Income (USD)</Label>
                <Controller
                  control={control}
                  name="income"
                  render={({ field }) => (
                    <Input placeholder="Income amount" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
                  )}
                />
              </View>
              {!shift?.isMileageOnly && (
                <View className="flex-1">
                  <Label>Tasks/Trips</Label>
                  <Controller
                    control={control}
                    name="tasksCompleted"
                    render={({ field }) => (
                      <Input placeholder="# tasks completed" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" />
                    )}
                  />
                </View>
              )}
            </View>

            {/* Platforms */}
            {!shift?.isMileageOnly && (
              <Controller
                control={control}
                name="platforms"
                render={({ field }) => (
                  <PlatformSelector
                    selectedPlatforms={field.value}
                    onPlatformsChange={field.onChange}
                    savedPlatforms={businessSettings?.gigPlatforms || []}
                    onSaveNewPlatform={handleSaveNewPlatform}
                  />
                )}
              />
            )}
          </View>
        </ScrollView>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button onPress={handleSubmit(handleSubmitForm)} loading={saving} disabled={saving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditShiftDialog;
