import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key: SALTEA Row Level Security.
// Usarlo solo en procesos sin usuario logueado (por ejemplo, el cron) y nunca en el navegador.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
