import { supabase } from "@/integrations/supabase/client";

export interface UsageCheckResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  remaining: number;
  reason: 'within_limit' | 'limit_reached' | 'unlimited' | 'feature_not_allowed';
}

export class UsageTracker {
  /**
   * Check if a feature usage is within limits
   */
  static async checkUsageLimit(
    userId: string,
    featureKey: string,
    periodType: 'daily' | 'weekly' = 'daily'
  ): Promise<UsageCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_usage_limit', {
        p_user_id: userId,
        p_feature_key: featureKey,
        p_period_type: periodType
      });

      if (error) {
        console.error('Error checking usage limit:', error);
        return {
          allowed: false,
          current_usage: 0,
          limit: 0,
          remaining: 0,
          reason: 'feature_not_allowed'
        };
      }

      return data as unknown as UsageCheckResult;
    } catch (error) {
      console.error('Exception checking usage limit:', error);
      return {
        allowed: false,
        current_usage: 0,
        limit: 0,
        remaining: 0,
        reason: 'feature_not_allowed'
      };
    }
  }

  /**
   * Increment usage for a feature and return new count
   */
  static async incrementUsage(
    userId: string,
    featureKey: string,
    periodType: 'daily' | 'weekly' = 'daily',
    increment: number = 1
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('increment_feature_usage', {
        p_user_id: userId,
        p_feature_key: featureKey,
        p_period_type: periodType,
        p_increment: increment
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return 0;
      }

      return data as number;
    } catch (error) {
      console.error('Exception incrementing usage:', error);
      return 0;
    }
  }

  /**
   * Get current usage for a feature
   */
  static async getCurrentUsage(
    userId: string,
    featureKey: string,
    periodType: 'daily' | 'weekly' = 'daily'
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_current_usage', {
        p_user_id: userId,
        p_feature_key: featureKey,
        p_period_type: periodType
      });

      if (error) {
        console.error('Error getting current usage:', error);
        return 0;
      }

      return data as number;
    } catch (error) {
      console.error('Exception getting current usage:', error);
      return 0;
    }
  }

  /**
   * Check if user can use a feature before allowing access
   */
  static async canUseFeature(
    userId: string,
    featureKey: string,
    periodType: 'daily' | 'weekly' = 'daily'
  ): Promise<{ allowed: boolean; remaining: number; reason: string }> {
    const result = await this.checkUsageLimit(userId, featureKey, periodType);
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      reason: result.reason
    };
  }

  /**
   * Use a feature (check limit + increment if allowed)
   */
  static async useFeature(
    userId: string,
    featureKey: string,
    periodType: 'daily' | 'weekly' = 'daily'
  ): Promise<{ success: boolean; newUsage: number; remaining: number; reason: string }> {
    // First check if usage is allowed
    const checkResult = await this.checkUsageLimit(userId, featureKey, periodType);
    
    if (!checkResult.allowed) {
      return {
        success: false,
        newUsage: checkResult.current_usage,
        remaining: checkResult.remaining,
        reason: checkResult.reason
      };
    }

    // If allowed, increment usage
    const newUsage = await this.incrementUsage(userId, featureKey, periodType);
    
    return {
      success: true,
      newUsage,
      remaining: Math.max(0, checkResult.limit - newUsage),
      reason: 'success'
    };
  }
}

// Feature key constants matching your table
export const FEATURE_KEYS = {
  SHIFTBUDDY_CHAT: 'shiftbuddy_chat',
  SHIFT_HISTORY_DAYS: 'shift_history_days',
  HEATMAP_RANGE: 'heatmap_range',
  RECOMMENDATIONS: 'recommendations',
  TAX_TOOLS: 'tax_tools',
  DYNAMIC_HEATMAP: 'dynamic_heatmap',
  CUSTOM_TIME_BLOCKS: 'custom_time_blocks',
  SMART_SHIFT_ALERTS: 'smart_shift_alerts',
  BURNOUT_TRACKING: 'burnout_tracking',
  PREDICTIVE_PLANNER: 'predictive_planner',
  EXPORT_DATA: 'export_data',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

// Helper to determine period type based on feature
export function getFeaturePeriodType(featureKey: string): 'daily' | 'weekly' {
  switch (featureKey) {
    case FEATURE_KEYS.SHIFTBUDDY_CHAT:
      // Free tier uses weekly, Pro/Elite use daily
      return 'weekly'; // Default to weekly, components can override
    case FEATURE_KEYS.RECOMMENDATIONS:
      return 'daily';
    default:
      return 'daily';
  }
}