
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
// 🚩 FLAG: useToast from @/components/ui/use-toast (shadcn) → @/hooks/use-toast (RN shim)
import { useToast } from "@/hooks/use-toast";

export interface BusinessSettings {
  id?: string;
  businessName: string;
  businessType: string;
  currentTaxYear: string;
  defaultMileageRate: number;
  rememberMePreference: boolean;
  mileageCalculationMethod: 'manual_odometer' | 'gps_tracking';
  gigPlatforms: string[];
  timezone: string;
  clockFormat: '12-hour' | '24-hour';
  darkModePreference: 'light' | 'dark' | 'system';
}

export const useBusinessSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  const defaultSettings: BusinessSettings = {
    businessName: "My Business",
    businessType: "Sole Proprietorship",
    currentTaxYear: currentYear.toString(),
    defaultMileageRate: 0.725,
    rememberMePreference: false,
    mileageCalculationMethod: 'manual_odometer',
    gigPlatforms: [],
    timezone: "America/New_York",
    clockFormat: "12-hour",
    darkModePreference: "system",
  };

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setSettings(defaultSettings);
      setLoading(false);
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_business_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading business settings:", error);
        setSettings(defaultSettings);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          businessName: data.business_name,
          businessType: data.business_type,
          currentTaxYear: data.current_tax_year,
          defaultMileageRate: data.default_mileage_rate,
          rememberMePreference: data.remember_me_preference || false,
          mileageCalculationMethod: (data.mileage_calculation_method as 'manual_odometer' | 'gps_tracking') || 'manual_odometer',
          gigPlatforms: Array.isArray(data.gig_platforms) ? data.gig_platforms : [],
          timezone: data.timezone || "America/New_York",
          clockFormat: (data.clock_format as '12-hour' | '24-hour') || "12-hour",
          darkModePreference: (data.dark_mode_preference as 'light' | 'dark' | 'system') || "system",
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Exception loading business settings:", error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: BusinessSettings) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save settings.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const settingsData = {
        user_id: user.id,
        business_name: newSettings.businessName,
        business_type: newSettings.businessType,
        current_tax_year: newSettings.currentTaxYear,
        default_mileage_rate: newSettings.defaultMileageRate,
        remember_me_preference: newSettings.rememberMePreference,
        mileage_calculation_method: newSettings.mileageCalculationMethod,
        gig_platforms: Array.isArray(newSettings.gigPlatforms) ? newSettings.gigPlatforms : [],
        timezone: newSettings.timezone,
        clock_format: newSettings.clockFormat,
        dark_mode_preference: newSettings.darkModePreference,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('user_business_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('user_business_settings')
          .insert(settingsData)
          .select()
          .single();
        if (error) throw error;
        newSettings.id = data.id;
      }

      setSettings(newSettings);
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated.",
      });
      return true;
    } catch (error) {
      console.error("Error saving business settings:", error);
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    settings,
    loading,
    saveSettings,
    updateSettings: setSettings,
  };
};
