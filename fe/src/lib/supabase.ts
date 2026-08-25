import { createClient } from "@supabase/supabase-js";

// Read from Vite env vars (set in fe/.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️ VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in fe/.env");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");
