import { createClient } from "./server";

export type Profile = { id: string; email: string; full_name: string | null; role: "ADMIN" | "AGENT"; is_active: boolean };

export async function getSessionProfile(): Promise<{ user: any; profile: Profile | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, profile: null };
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return { user, profile: (profile as Profile) || null };
  } catch {
    return { user: null, profile: null };
  }
}
