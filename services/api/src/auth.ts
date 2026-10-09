import { createClient } from "@supabase/supabase-js";
import type { SessionUser } from "./tenant.js";

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function getSupabaseUser(authorization: string | undefined): Promise<SessionUser | null> {
  if (!supabase || !authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const metadata = data.user.app_metadata as { company_id?: string; role?: SessionUser["role"] };
  return { id: data.user.id, companyId: metadata.company_id ?? null, role: metadata.role ?? "AGENT" };
}
