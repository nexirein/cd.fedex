import { Sidebar } from "./Sidebar";
import { getSessionProfile } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen bg-[var(--fx-bg)]">
      <Sidebar profile={profile ? { full_name: profile.full_name, email: profile.email, role: profile.role } : { full_name: user.email || "User", email: user.email || "", role: "AGENT" }} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
