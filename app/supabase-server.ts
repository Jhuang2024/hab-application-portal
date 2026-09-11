import { createClient, type User } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase-config";

export type SupabaseUser = { userId: string; displayName: string; email: string };

export async function getSupabaseUser(request: Request): Promise<SupabaseUser | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user?.email) return null;
  return normalizeUser(data.user);
}

function normalizeUser(user: User): SupabaseUser {
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return { userId: user.id, email: user.email!, displayName: fullName || user.email! };
}
