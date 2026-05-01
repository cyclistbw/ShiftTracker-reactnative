
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

// ── Module-level dedupe ──────────────────────────────────────────────────
// useBusinessSettings is called from ~12 different files.  Without dedupe,
// every component instance fires its own user_business_settings query on
// mount, saturating the HTTP connection pool on Android (especially right
// after login when many tabs/components mount at once).
//
// Cache by userId so a switch-account / logout-login produces a fresh fetch.
let cachedPromise: Promise<BusinessSettings> | null = null;
let cachedUserId: string | null = null;

function invalidateBusinessSettingsCache() {
  cachedPromise = null;
  cachedUserId = null;
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
    if (!user) {
      invalidateBusinessSettingsCache();
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }
    // Stagger 300 ms after login so this query doesn't compete with the shifts
    // queries that fire simultaneously. Android OkHttp allows 5 concurrent
    // connections per host; too many at once causes all of them to queue
    // server-side and hang indefinitely.
    const timer = setTimeout(loadSettings, 300);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const fetchSettingsForUser = async (userId: string): Promise<BusinessSettings> => {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 24000);
    let data: any, error: any;
    try {
      ({ data, error } = await new Promise<{ data: any; error: any }>((resolve, reject) => {
        const hardTimer = setTimeout(() => reject(new Error('hard timeout')), 25000);
        supabase
          .from('user_business_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
          .abortSignal(controller.signal)
          .then(
            (val) => { clearTimeout(hardTimer); resolve(val); },
            (err) => { clearTimeout(hardTimer); reject(err); }
          );
      }));
    } finally {
      clearTimeout(abortTimer);
    }

    if (error) {
      console.error("Error loading business settings:", error);
      return defaultSettings;
    }

    if (!data) return defaultSettings;

    return {
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
    };
  };

  const loadSettings = async () => {
    if (!user) return;

    // UI-unblock timer: show defaults and clear spinner after 8 s so the
    // Settings tab doesn't spin forever.  The actual await below stays alive —
    // when the server warms (~15–20 s) and the real data arrives, setSettings
    // is called again and overwrites the defaults.
    const uiTimer = setTimeout(() => {
      setSettings(prev => prev ?? defaultSettings);
      setLoading(false);
    }, 8000);

    try {
      if (!cachedPromise || cachedUserId !== user.id) {
        cachedUserId = user.id;
        cachedPromise = fetchSettingsForUser(user.id);
      }
      const result = await cachedPromise;
      setSettings(result);
    } catch (error) {
      console.error("Exception loading business settings:", error);
      setSettings(defaultSettings);
      invalidateBusinessSettingsCache();
    } finally {
      clearTimeout(uiTimer);
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
      // Refresh the shared cache so other hook instances pick up the new
      // values on their next mount.
      cachedUserId = user.id;
      cachedPromise = Promise.resolve(newSettings);
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
