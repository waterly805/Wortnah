import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://dffmqcqidqkbqeorjtlb.supabase.co";
export const supabasePublishableKey = "sb_publishable_Vdd1vOelkMBeixBQe0nLzw_4GPVdaPO";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
