import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget insert into user_activity_log.
 * Non-blocking — errors are silently logged, never affect UI.
 */
const insertActivity = (
  userId: string,
  eventType: string,
  eventTarget?: string,
  metadata?: Record<string, unknown>
) => {
  supabase
    .from('user_activity_log' as any)
    .insert([{
      user_id: userId,
      event_type: eventType,
      event_target: eventTarget || null,
      metadata: metadata || {},
    }])
    .then(({ error }) => {
      if (error) {
        console.warn('Activity tracking insert failed:', error.message);
      }
    });
};

/**
 * Returns a `trackEvent` function and auto-tracks screen views on navigation changes.
 * Only tracks when a user is authenticated.
 */
export function useActivityTracker() {
  const userIdRef = useRef<string | null>(null);

  // Get user ID once on mount and keep it current
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id ?? null;
    });

    return () => subscription.unsubscribe();
  }, []);

  const trackEvent = useCallback(
    (eventType: string, eventTarget?: string, metadata?: Record<string, unknown>) => {
      if (userIdRef.current) {
        insertActivity(userIdRef.current, eventType, eventTarget, metadata);
      }
    },
    []
  );

  return { trackEvent };
}

/**
 * Standalone function for use outside of React components (e.g. AuthContext).
 * Requires passing the userId explicitly.
 */
export function trackActivityEvent(
  userId: string,
  eventType: string,
  eventTarget?: string,
  metadata?: Record<string, unknown>
) {
  insertActivity(userId, eventType, eventTarget, metadata);
}
