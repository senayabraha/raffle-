import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * The project URL and publishable key are *public* by design — data access is
 * governed by Row Level Security on the database. We read them from Vite env
 * vars when available, with a fallback to the project's known public values so
 * the deployment works without extra configuration.
 */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://fnxgkzekasdminmseqhx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "sb_publishable_AlJz-uxEhI8ZxvavNL-Mtg_Tew7pdn6";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
