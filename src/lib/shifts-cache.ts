// Shared shift fetch cache so useShiftHistory and TaxReport don't fire two
// independent queries for the same data on every login.  Cuts initial-load
// network traffic roughly in half on the History/Tax screens.
//
// Usage from a hook:
//   const { regular, imported } = await getCachedShifts(user.id);
//
// Cache is invalidated on logout via `invalidateShiftsCache()` (called from
// the AuthContext signOut flow indirectly — see useEffects that watch `user`).

import { supabase } from "@/integrations/supabase/client";

export interface RawShiftRow {
  id: string;
  user_id: string;
  start_time: string | null;
  end_time: string | null;
  earnings: number | null;
  miles_driven: number | null;
  tasks_completed: number | null;
  platform: string | null;
  is_mileage_only: boolean | null;
  summary_data: any;
}

export interface CachedShifts {
  regular: RawShiftRow[];
  imported: RawShiftRow[];
}

let cachedPromise: Promise<CachedShifts> | null = null;
let cachedUserId: string | null = null;

export function invalidateShiftsCache() {
  cachedPromise = null;
  cachedUserId = null;
}

const COLS =
  "id,user_id,start_time,end_time,earnings,miles_driven,tasks_completed,platform,is_mileage_only,summary_data";

// Single fetch attempt with a hard-reject deadline.
// We intentionally do NOT abort+retry — aborting from JS does not cancel the
// underlying OkHttp request.  Dead connections stay "in use" in OkHttp's pool
// (max 5 per host), leaving no slots for a retry.  Instead we hold a single
// connection open for up to 25 s.  PostgREST/PgBouncer typically warms its
// cold connection within 15–20 s after a fresh JWT; at that point this
// waiting connection completes successfully.  Safety timers in the consumers
// (useShiftHistory, TaxReport) keep the UI responsive in the meantime.
async function doFetch(userId: string): Promise<CachedShifts> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 24000);

  try {
    const [main, imported] = await new Promise<[any, any]>((resolve, reject) => {
      const hardTimer = setTimeout(() => reject(new Error('hard timeout')), 25000);

      Promise.all([
        supabase
          .from("shift_summaries")
          .select(COLS)
          .eq("user_id", userId)
          .order("start_time", { ascending: false })
          .abortSignal(controller.signal),
        supabase
          .from("shift_summaries_import")
          .select(COLS)
          .eq("user_id", userId)
          .order("start_time", { ascending: false })
          .abortSignal(controller.signal),
      ]).then(
        (val) => { clearTimeout(hardTimer); resolve(val); },
        (err) => { clearTimeout(hardTimer); reject(err); }
      );
    });

    if (main.error || imported.error) throw new Error(main.error?.message ?? imported.error?.message ?? 'supabase error');
    return {
      regular: ((main.data as unknown) as RawShiftRow[]) ?? [],
      imported: ((imported.data as unknown) as RawShiftRow[]) ?? [],
    };
  } catch (err) {
    if (cachedUserId === userId) { cachedPromise = null; cachedUserId = null; }
    return { regular: [], imported: [] };
  } finally {
    clearTimeout(abortTimer);
  }
}

/**
 * Fetch shifts for a user, deduplicated across all consumers.
 * Subsequent callers within the same login session get the same Promise.
 *
 * Cold PostgREST/PgBouncer connections after a fresh JWT take 15–20 s to
 * warm server-side.  We hold a single connection for up to 25 s rather than
 * abort+retry — aborting doesn't free OkHttp slots, so retries starve.
 */
export function getCachedShifts(userId: string): Promise<CachedShifts> {
  if (cachedPromise && cachedUserId === userId) return cachedPromise;
  cachedUserId = userId;
  cachedPromise = doFetch(userId);
  return cachedPromise;
}
