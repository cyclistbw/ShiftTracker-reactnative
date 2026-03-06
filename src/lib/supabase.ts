// Re-export from the integrations client for files that import from '@/lib/supabase'
export { supabase } from "@/integrations/supabase/client";
export const isSupabaseConfigured = () => true;
