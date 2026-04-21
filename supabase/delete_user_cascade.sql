-- ============================================================
-- USER DELETION CASCADE + AUDIT LOG
-- Run once in Supabase SQL Editor.
-- Covers three scenarios:
--   1. Admin deletes user from Authentication dashboard
--   2. User deletes their own account from within the app
--      (via the delete-account edge function)
--   3. Manual orphan cleanup sweep
-- ============================================================


-- ── Audit log table ──────────────────────────────────────────
-- Permanent record of every deletion. Query any time.
CREATE TABLE IF NOT EXISTS public.user_deletion_log (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted_at   timestamptz DEFAULT now() NOT NULL,
  user_id      uuid        NOT NULL,
  email        text,        -- from auth.users; NULL for orphaned users (already removed)
  source       text        NOT NULL, -- 'auth_trigger' | 'orphan_cleanup'
  table_name   text        NOT NULL,
  rows_deleted bigint      NOT NULL
);

CREATE INDEX IF NOT EXISTS user_deletion_log_user_id_idx   ON public.user_deletion_log (user_id);
CREATE INDEX IF NOT EXISTS user_deletion_log_deleted_at_idx ON public.user_deletion_log (deleted_at DESC);


-- ── Fix log_session_security_event trigger ───────────────────
-- This trigger fires on user_sessions DELETE and logs to app_logs.
-- When a user is orphaned (already gone from auth.users), the INSERT
-- into app_logs fails its FK constraint. Wrap it in an EXCEPTION
-- handler so it silently skips logging for non-existent users.
CREATE OR REPLACE FUNCTION public.log_session_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.app_logs (user_id, level, category, message, component, metadata)
    VALUES (
      OLD.user_id, 'info', 'security', 'Session revoked', 'session_management',
      jsonb_build_object('session_id', OLD.id, 'revoked_at', now())
    );
  EXCEPTION WHEN foreign_key_violation THEN
    -- User no longer exists in auth.users (orphaned or mid-deletion); skip log entry
    NULL;
  END;
  RETURN OLD;
END;
$$;


-- ── Trigger function ─────────────────────────────────────────
-- Fires AFTER DELETE on auth.users — has OLD.id and OLD.email.
-- Deletes all user data then writes one log row per table that had rows.
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  -- Shift data (child before parent)
  DELETE FROM public.shift_expenses WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','shift_expenses',n); END IF;

  DELETE FROM public.shift_summaries WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','shift_summaries',n); END IF;

  DELETE FROM public.shift_summaries_import WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','shift_summaries_import',n); END IF;

  -- Dynamic / heatmap pipeline
  DELETE FROM public.dynamic_raw_task_data WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','dynamic_raw_task_data',n); END IF;

  DELETE FROM public.dynamic_preprocessed_tasks WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','dynamic_preprocessed_tasks',n); END IF;

  DELETE FROM public.dynamic_preprocessed_filtered_tasks WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','dynamic_preprocessed_filtered_tasks',n); END IF;

  DELETE FROM public.dynamic_heatmap_summary WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','dynamic_heatmap_summary',n); END IF;

  DELETE FROM public.dynamic_csv_uploads WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','dynamic_csv_uploads',n); END IF;

  -- AI / chat
  DELETE FROM public.chat_logs WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','chat_logs',n); END IF;

  -- User settings & profile
  DELETE FROM public.app_logs WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','app_logs',n); END IF;

  DELETE FROM public.user_vehicles WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_vehicles',n); END IF;

  DELETE FROM public.user_sessions WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_sessions',n); END IF;

  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_roles',n); END IF;

  DELETE FROM public.user_feature_usage WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_feature_usage',n); END IF;

  DELETE FROM public.user_analytics_preferences WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_analytics_preferences',n); END IF;

  DELETE FROM public.user_business_settings WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_business_settings',n); END IF;

  DELETE FROM public.user_preferences WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_preferences',n); END IF;

  DELETE FROM public.user_activity_log WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_activity_log',n); END IF;

  DELETE FROM public.user_profile WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','user_profile',n); END IF;

  -- Feedback
  DELETE FROM public.feedback WHERE user_id = OLD.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO public.user_deletion_log (user_id,email,source,table_name,rows_deleted) VALUES (OLD.id,OLD.email,'auth_trigger','feedback',n); END IF;

  RETURN OLD;
END;
$$;

-- ── Trigger ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();


-- ============================================================
-- ORPHANED DATA CLEANUP
-- Finds user_ids in app tables that no longer exist in auth.users,
-- deletes all their rows, logs to user_deletion_log, and returns
-- a full report grouped by user + table.
--
-- Note: email shows as NULL for orphaned users because their
-- auth.users row is already gone — the UID is all that remains.
-- ============================================================
DROP FUNCTION IF EXISTS public.purge_orphaned_user_data();

CREATE OR REPLACE FUNCTION public.purge_orphaned_user_data()
RETURNS TABLE(
  user_id      uuid,
  email        text,
  source       text,
  table_name   text,
  rows_deleted bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Delete orphaned rows from all tables, aggregate per-user-per-table,
  -- insert into the audit log, and return the inserted rows — all in one pass.
  -- No temp tables needed.
  WITH
  d_shift_expenses AS (
    DELETE FROM public.shift_expenses
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_shift_summaries AS (
    DELETE FROM public.shift_summaries
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_shift_summaries_import AS (
    DELETE FROM public.shift_summaries_import
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_dynamic_raw AS (
    DELETE FROM public.dynamic_raw_task_data
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_dynamic_pre AS (
    DELETE FROM public.dynamic_preprocessed_tasks
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_dynamic_filtered AS (
    DELETE FROM public.dynamic_preprocessed_filtered_tasks
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_heatmap AS (
    DELETE FROM public.dynamic_heatmap_summary
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_csv AS (
    DELETE FROM public.dynamic_csv_uploads
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_chat AS (
    DELETE FROM public.chat_logs
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_app_logs AS (
    DELETE FROM public.app_logs
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_vehicles AS (
    DELETE FROM public.user_vehicles
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_sessions AS (
    DELETE FROM public.user_sessions
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_roles AS (
    DELETE FROM public.user_roles
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_feature_usage AS (
    DELETE FROM public.user_feature_usage
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_analytics_prefs AS (
    DELETE FROM public.user_analytics_preferences
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_biz_settings AS (
    DELETE FROM public.user_business_settings
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_preferences AS (
    DELETE FROM public.user_preferences
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_activity AS (
    DELETE FROM public.user_activity_log
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_profile AS (
    DELETE FROM public.user_profile
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  d_feedback AS (
    DELETE FROM public.feedback
    WHERE user_id NOT IN (SELECT id FROM auth.users) RETURNING user_id
  ),
  all_deleted AS (
    SELECT user_id, 'app_logs'::text                                AS tbl FROM d_app_logs
    UNION ALL SELECT user_id, 'shift_expenses'::text               FROM d_shift_expenses
    UNION ALL SELECT user_id, 'shift_summaries'                     FROM d_shift_summaries
    UNION ALL SELECT user_id, 'shift_summaries_import'              FROM d_shift_summaries_import
    UNION ALL SELECT user_id, 'dynamic_raw_task_data'               FROM d_dynamic_raw
    UNION ALL SELECT user_id, 'dynamic_preprocessed_tasks'          FROM d_dynamic_pre
    UNION ALL SELECT user_id, 'dynamic_preprocessed_filtered_tasks' FROM d_dynamic_filtered
    UNION ALL SELECT user_id, 'dynamic_heatmap_summary'             FROM d_heatmap
    UNION ALL SELECT user_id, 'dynamic_csv_uploads'                 FROM d_csv
    UNION ALL SELECT user_id, 'chat_logs'                           FROM d_chat
    UNION ALL SELECT user_id, 'user_vehicles'                       FROM d_vehicles
    UNION ALL SELECT user_id, 'user_sessions'                       FROM d_sessions
    UNION ALL SELECT user_id, 'user_roles'                          FROM d_roles
    UNION ALL SELECT user_id, 'user_feature_usage'                  FROM d_feature_usage
    UNION ALL SELECT user_id, 'user_analytics_preferences'          FROM d_analytics_prefs
    UNION ALL SELECT user_id, 'user_business_settings'              FROM d_biz_settings
    UNION ALL SELECT user_id, 'user_preferences'                    FROM d_preferences
    UNION ALL SELECT user_id, 'user_activity_log'                   FROM d_activity
    UNION ALL SELECT user_id, 'user_profile'                        FROM d_profile
    UNION ALL SELECT user_id, 'feedback'                            FROM d_feedback
  ),
  counts AS (
    SELECT
      user_id,
      NULL::text       AS email,   -- auth row already gone; UID is all that remains
      'orphan_cleanup' AS source,
      tbl              AS table_name,
      COUNT(*)         AS rows_deleted
    FROM all_deleted
    GROUP BY user_id, tbl
  ),
  -- Insert into audit log and return the inserted rows in one step
  logged AS (
    INSERT INTO public.user_deletion_log (user_id, email, source, table_name, rows_deleted)
    SELECT user_id, email, source, table_name, rows_deleted FROM counts
    RETURNING user_id, email, source, table_name, rows_deleted
  )
  SELECT user_id, email, source, table_name, rows_deleted
  FROM logged
  ORDER BY user_id, table_name;
$$;


-- ============================================================
-- ORPHANED USER PREVIEW (read-only — no deletions)
-- Run this BEFORE purge_orphaned_user_data() to see exactly
-- who will be affected, with email lookups where possible.
-- ============================================================
CREATE OR REPLACE FUNCTION public.preview_orphaned_users()
RETURNS TABLE(
  user_id        uuid,
  email_found    text,
  total_rows     bigint,
  tables_with_data text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- Find all distinct orphaned user_ids across every app table
  orphaned AS (
    SELECT DISTINCT user_id FROM public.shift_expenses
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.shift_summaries
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.shift_summaries_import
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.dynamic_raw_task_data
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.dynamic_preprocessed_tasks
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.dynamic_preprocessed_filtered_tasks
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.dynamic_heatmap_summary
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.dynamic_csv_uploads
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.chat_logs
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.app_logs
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_vehicles
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_sessions
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_roles
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_feature_usage
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_analytics_preferences
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_business_settings
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_preferences
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_activity_log
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.user_profile
      WHERE user_id NOT IN (SELECT id FROM auth.users)
    UNION SELECT DISTINCT user_id FROM public.feedback
      WHERE user_id NOT IN (SELECT id FROM auth.users)
  ),
  -- Try to find email from feedback table (stores email per submission)
  -- or from deletion log if this user was partially cleaned before
  email_lookup AS (
    SELECT DISTINCT ON (o.user_id)
      o.user_id,
      COALESCE(
        (SELECT email FROM public.feedback WHERE user_id = o.user_id AND email IS NOT NULL LIMIT 1),
        (SELECT email FROM public.user_deletion_log WHERE user_id = o.user_id AND email IS NOT NULL LIMIT 1),
        '[email not recoverable — auth row deleted]'
      ) AS email_found
    FROM orphaned o
  ),
  -- Count rows per orphaned user across all tables
  counts AS (
    SELECT user_id, COUNT(*) AS cnt, STRING_AGG(DISTINCT tbl, ', ' ORDER BY tbl) AS tbls
    FROM (
      SELECT user_id, 'shift_expenses'         AS tbl FROM public.shift_expenses         WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'shift_summaries'      FROM public.shift_summaries      WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'shift_summaries_import' FROM public.shift_summaries_import WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'dynamic_raw_task_data' FROM public.dynamic_raw_task_data WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'dynamic_preprocessed_tasks' FROM public.dynamic_preprocessed_tasks WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'dynamic_preprocessed_filtered_tasks' FROM public.dynamic_preprocessed_filtered_tasks WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'dynamic_heatmap_summary' FROM public.dynamic_heatmap_summary WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'dynamic_csv_uploads' FROM public.dynamic_csv_uploads   WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'chat_logs'            FROM public.chat_logs            WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'app_logs'             FROM public.app_logs             WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_vehicles'        FROM public.user_vehicles        WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_sessions'        FROM public.user_sessions        WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_roles'           FROM public.user_roles           WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_feature_usage'   FROM public.user_feature_usage   WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_analytics_preferences' FROM public.user_analytics_preferences WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_business_settings' FROM public.user_business_settings WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_preferences'    FROM public.user_preferences      WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_activity_log'   FROM public.user_activity_log     WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'user_profile'        FROM public.user_profile          WHERE user_id IN (SELECT user_id FROM orphaned)
      UNION ALL SELECT user_id, 'feedback'            FROM public.feedback              WHERE user_id IN (SELECT user_id FROM orphaned)
    ) all_rows
    GROUP BY user_id
  )
  SELECT
    o.user_id,
    e.email_found,
    c.cnt   AS total_rows,
    c.tbls  AS tables_with_data
  FROM orphaned o
  JOIN email_lookup e ON e.user_id = o.user_id
  JOIN counts c       ON c.user_id = o.user_id
  ORDER BY e.email_found;
$$;


-- ============================================================
-- USEFUL QUERIES (copy-paste into SQL Editor any time)
-- ============================================================

-- Run orphan cleanup and see full per-user-per-table report:
--   SELECT * FROM public.purge_orphaned_user_data();

-- Full deletion history, newest first:
--   SELECT * FROM public.user_deletion_log ORDER BY deleted_at DESC;

-- Summary per user — total rows deleted and which tables:
--   SELECT
--     user_id,
--     email,
--     source,
--     deleted_at::date          AS date,
--     SUM(rows_deleted)         AS total_rows,
--     array_agg(table_name)     AS tables_affected
--   FROM public.user_deletion_log
--   GROUP BY user_id, email, source, deleted_at::date
--   ORDER BY deleted_at DESC;

-- Look up a specific user's deletion record by email:
--   SELECT * FROM public.user_deletion_log
--   WHERE email = 'someone@example.com'
--   ORDER BY deleted_at DESC;


-- ============================================================
-- MONTHLY AUTOMATED ORPHAN CLEANUP (pg_cron)
-- Runs on the 1st of every month at 2:00 AM UTC.
-- Results are automatically stored in user_deletion_log.
-- To view results after any run, use the summary query above.
-- ============================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if it exists, then recreate
SELECT cron.unschedule('monthly-orphan-cleanup')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monthly-orphan-cleanup'
  );

SELECT cron.schedule(
  'monthly-orphan-cleanup',       -- job name
  '0 2 1 * *',                    -- 2:00 AM UTC on the 1st of every month
  $$SELECT public.purge_orphaned_user_data()$$
);

-- Verify it was scheduled:
--   SELECT jobid, jobname, schedule, command, active
--   FROM cron.job
--   WHERE jobname = 'monthly-orphan-cleanup';

-- To view the history of past automated runs:
--   SELECT runid, jobid, status, start_time, end_time, return_message
--   FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monthly-orphan-cleanup')
--   ORDER BY start_time DESC;

-- To pause the schedule without deleting it:
--   UPDATE cron.job SET active = false WHERE jobname = 'monthly-orphan-cleanup';

-- To resume:
--   UPDATE cron.job SET active = true WHERE jobname = 'monthly-orphan-cleanup';

-- To change schedule (e.g. every Sunday at 3 AM instead):
--   SELECT cron.unschedule('monthly-orphan-cleanup');
--   SELECT cron.schedule('monthly-orphan-cleanup', '0 3 * * 0', $$SELECT public.purge_orphaned_user_data()$$);
