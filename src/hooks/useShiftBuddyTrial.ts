import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ShiftBuddyTrialStatus {
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialStartedAt: string | null;
  trialExpired: boolean;
  isLoading: boolean;
}

export function useShiftBuddyTrial() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<ShiftBuddyTrialStatus>({
    isTrialActive: false,
    trialDaysRemaining: 0,
    trialStartedAt: null,
    trialExpired: false,
    isLoading: true
  });

  const checkTrialStatus = useCallback(async () => {
    if (!user) {
      setTrialStatus({
        isTrialActive: false,
        trialDaysRemaining: 0,
        trialStartedAt: null,
        trialExpired: false,
        isLoading: false
      });
      return;
    }

    try {
      setTrialStatus(prev => ({ ...prev, isLoading: true }));

      // Check current trial status from subscribers table
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('trial_started_at, trial_expires_at, subscribed, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error checking trial status:', error);
        setTrialStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const now = new Date();
      let isTrialActive = false;
      let trialDaysRemaining = 0;
      let trialStartedAt = subscriber?.trial_started_at || null;
      let trialExpired = false;

      // Check if trial has expired based on trial_expires_at
      if (subscriber?.trial_expires_at) {
        const trialExpiryDate = new Date(subscriber.trial_expires_at);
        trialExpired = now >= trialExpiryDate;
      }

      // If user has a paid subscription, they don't need trial
      if (subscriber?.subscribed && subscriber?.subscription_tier !== 'free') {
        setTrialStatus({
          isTrialActive: false,
          trialDaysRemaining: 0,
          trialStartedAt,
          trialExpired: false,
          isLoading: false
        });
        return;
      }

      // If trial exists and hasn't expired, calculate remaining days
      if (trialStartedAt && !trialExpired && subscriber?.trial_expires_at) {
        isTrialActive = true;
        const trialExpiryDate = new Date(subscriber.trial_expires_at);
        trialDaysRemaining = Math.ceil((trialExpiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        // Ensure we don't show negative days
        if (trialDaysRemaining < 0) {
          trialDaysRemaining = 0;
          isTrialActive = false;
          trialExpired = true;
        }
      }

      setTrialStatus({
        isTrialActive,
        trialDaysRemaining,
        trialStartedAt,
        trialExpired,
        isLoading: false
      });

    } catch (error) {
      console.error('Error checking ShiftBuddy trial:', error);
      setTrialStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

  return {
    ...trialStatus,
    refreshTrialStatus: checkTrialStatus
  };
}
