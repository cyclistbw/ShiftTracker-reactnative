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

/**
 * Fetch shifts for a user, deduplicated across all consumers.
 * Subsequent callers within the same login session get the same Promise.
 */
export function getCachedShifts(userId: string): Promise<CachedShifts> {
  if (cachedPromise && cachedUserId === userId) return cachedPromise;
  cachedUserId = userId;
  cachedPromise = (async () => {
    // Only select columns we actually use — `summary_data` is the heavy JSONB
    // column, but we still need it for backward-compat parsing of legacy rows.
    const cols =
      "id,user_id,start_time,end_time,earnings,miles_driven,tasks_completed,platform,is_mileage_only,summary_data";
    const [main, imported] = await Promise.all([
      supabase
        .from("shift_summaries")
        .select(cols)
        .eq("user_id", userId)
        .order("start_time", { ascending: false }),
      supabase
        .from("shift_summaries_import")
        .select(cols)
        .eq("user_id", userId)
        .order("start_time", { ascending: false }),
    ]);
    return {
      regular: ((main.data as unknown) as RawShiftRow[]) ?? [],
      imported: ((imported.data as unknown) as RawShiftRow[]) ?? [],
    };
  })();
  return cachedPromise;
}
