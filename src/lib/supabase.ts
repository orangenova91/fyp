import "server-only";
import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "./schema";

function connect() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const globalForSupabase = globalThis as unknown as { capstoneSupabase?: ReturnType<typeof connect> };

export function storage() {
  globalForSupabase.capstoneSupabase ??= connect();
  return globalForSupabase.capstoneSupabase.storage.from(STORAGE_BUCKET);
}
