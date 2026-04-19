// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
// 🚩 FLAG: <div>/<span> → <View>/<Text>
// 🚩 FLAG: e.target.value → onChangeText
// 🚩 FLAG: type="number" → keyboardType="decimal-pad"
// 🚩 FLAG: onClick → onPress
import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { View, Text } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

const businessTypes = [
  "Sole Proprietorship",
  "LLC",
  "S-Corporation",
  "C-Corporation",
  "Partnership",
  "Non-Profit",
];

const gigPlatforms = [
  "Uber", "Lyft", "DoorDash", "Uber Eats", "Grubhub", "Postmates",
  "Instacart", "Shipt", "Amazon Flex", "Roadie", "Lime", "Bird",
  "Spin", "TaskRabbit", "Rover",
];

const BusinessSettings = () => {
  const { user } = useAuth();
  const { settings, loading, saveSettings } = useBusinessSettings();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    currentTaxYear: "",
    defaultMileageRate: 0,
    gigPlatforms: [] as string[],
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings && !loading) {
      const safeGigPlatforms = Array.isArray(settings.gigPlatforms) ? settings.gigPlatforms : [];
      setFormData({
        businessName: settings.businessName || "",
        businessType: settings.businessType || "",
        currentTaxYear: settings.currentTaxYear || "",
        defaultMileageRate: settings.defaultMileageRate || 0,
        gigPlatforms: safeGigPlatforms,
      });
      setHasChanges(false);
    }
  }, [settings, loading]);

  const handleSave = useCallback(async () => {
    if (!settings || !hasChanges) return;
    setIsSaving(true);
    const updatedSettings = {
      ...settings,
      ...formData,
      gigPlatforms: Array.isArray(formData.gigPlatforms) ? formData.gigPlatforms : [],
    };
    const success = await saveSettings(updatedSettings);
    if (success) setHasChanges(false);
    setIsSaving(false);
  }, [settings, formData, hasChanges, saveSettings]);

  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => {
      if (field === 'gigPlatforms') {
        const newValue = Array.isArray(value) ? value : [];
        return { ...prev, [field]: newValue };
      }
      return { ...prev, [field]: value };
    });
    setHasChanges(true);
  }, []);

  const shouldRenderMultiSelect = React.useMemo(() => {
    return (
      !loading &&
      settings !== null &&
      Array.isArray(gigPlatforms) &&
      gigPlatforms.length > 0 &&
      Array.isArray(formData.gigPlatforms) &&
      formData.gigPlatforms !== null &&
      formData.gigPlatforms !== undefined
    );
  }, [formData.gigPlatforms, loading, settings]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Loading business settings...</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Please log in to manage your business settings.</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Failed to load business settings.</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <View className="mb-6">
          <Text className="text-xl font-semibold text-foreground">Business Settings</Text>
        </View>

        <View className="gap-4">
          {/* Business Name */}
          <View>
            <Label className="mb-1">Business Name</Label>
            <Input
              value={formData.businessName}
              // 🚩 FLAG: onChange e.target.value → onChangeText
              onChangeText={(text) => updateFormData('businessName', text)}
              className="mt-1"
            />
          </View>

          {/* Business Type */}
          <View>
            <Label className="mb-1">Business Type</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => updateFormData('businessType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>

          {/* Current Tax Year */}
          <View>
            <Label className="mb-1">Current Tax Year</Label>
            <Select
              value={formData.currentTaxYear}
              onValueChange={(value) => updateFormData('currentTaxYear', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tax year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>

          {/* Default Mileage Rate */}
          <View>
            <Label className="mb-1">Default Mileage Rate ($ per mile)</Label>
            <Input
              // 🚩 FLAG: type="number" step="0.001" → keyboardType="decimal-pad"
              keyboardType="decimal-pad"
              value={formData.defaultMileageRate.toString()}
              onChangeText={(text) => updateFormData('defaultMileageRate', parseFloat(text) || 0)}
              className="mt-1"
            />
          </View>

          {/* Gig Platforms */}
          <View>
            <Label className="mb-1">Gig Platforms</Label>
            {shouldRenderMultiSelect ? (
              <MultiSelect
                options={gigPlatforms.filter(Boolean)}
                selected={formData.gigPlatforms.filter(Boolean)}
                onChange={(selected: string[]) => updateFormData('gigPlatforms', Array.isArray(selected) ? selected : [])}
                placeholder="Select gig platforms you work with..."
                className="mt-1"
              />
            ) : (
              <View className="mt-1 p-2 border border-border rounded-md bg-muted">
                <Text className="text-sm text-muted-foreground">Loading gig platforms...</Text>
              </View>
            )}
            <Text className="text-sm text-muted-foreground mt-1">
              Select all the gig platforms you currently work with or plan to work with.
            </Text>
          </View>

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            className="mt-2"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </View>
      </CardContent>
    </Card>
  );
};

export default BusinessSettings;
