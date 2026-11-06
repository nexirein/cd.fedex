"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, Boxes, Radar, Users, Settings, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Pre-Alert Flow", icon: Upload },
  { href: "/batches", label: "Batch History", icon: Boxes },
  { href: "/admin/links", label: "Link Open Dashboard", icon: Radar, admin: true },
  { href: "/admin/users", label: "Users", icon: Users, admin: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, admin: true },
];

export function Sidebar({ profile }: { profile: { full_name: string | null; email: string; role: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = nav.filter((n) => !n.admin || profile?.role === "ADMIN");
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  return (
    <aside className="flex h-screen w-[268px] flex-col sticky top-0 shrink-0 bg-[linear-gradient(180deg,#2F0A57_0%,#4D148C_38%,#3B0F6B_100%)] text-white shadow-[4px_0_24px_-12px_rgba(47,10,87,.45)]">
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[linear-gradient(180deg,#ff7a1f,var(--fx-orange-500))] grid place-items-center font-extrabold text-[14px] shadow-[0_8px_18px_-8px_rgba(255,102,0,.65)]">FX</div>
          <div>
            <div className="text-[18px] font-extrabold tracking-tight leading-tight">Clearance Desk</div>
            <div className="text-[12px] text-white/65">FedEx pre-alert operations</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/40 px-3 mb-2">Workspace</div>
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14px] font-semibold transition-all",
                  active
                    ? "bg-white text-[var(--fx-purple-700)] shadow-[0_8px_20px_-14px_rgba(0,0,0,.35)]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}>
                <Icon size={18} className={active ? "text-[var(--fx-purple-700)]" : "text-white/70 group-hover:text-white"} />
                <span className="flex-1">{item.label}</span>
                {active ? <ChevronRight size={15} className="text-[var(--fx-purple-600)]" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="px-3 pb-3">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Environment</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,102,0,.22)] px-2 py-0.5 text-[10px] font-bold text-[#ffd7bf]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--fx-orange-500)] animate-pulse" />TEST</span>
          </div>
          <div className="text-[12px] text-white/75 leading-snug">Allow-list enforced for outbound pre-alerts.</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] px-2 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-white/15 grid place-items-center text-[11px] font-bold shrink-0">{(profile?.full_name || profile?.email || "U").slice(0,2).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{profile?.full_name || "User"}</div>
              <div className="truncate text-[11px] text-white/55">{profile?.role || "AGENT"}</div>
            </div>
          </div>
          <button onClick={logout} title="Sign out" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
