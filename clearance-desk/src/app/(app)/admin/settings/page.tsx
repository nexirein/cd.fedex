
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { ResetDataButton } from "./ResetDataButton";

export default async function SettingsPage() {
  let settings: any = null, allow: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    settings = data;
    const { data: a } = await supabase.from("allow_list").select("*").order("email");
    allow = a || [];
  } catch {}
  return (
    <>
      <Topbar title="Settings" subtitle="Configuration and demo data controls (admin)" />
      <main className="p-6 space-y-4">
        <ResetDataButton />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="fx-card p-5">
            <h3 className="text-[16px] font-semibold mb-3">Send Configuration</h3>
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between border-b border-[var(--fx-border)] py-2"><span className="text-[var(--fx-text-subtle)]">Pre-alert sending (current app behavior)</span><span className="fx-badge fx-badge-success">Demo/Open</span></div>
              <div><div className="text-[var(--fx-text-subtle)] mb-1">Sendable End Results (settings)</div><div className="flex flex-wrap gap-2">{(settings?.sendable_end_results||[]).map((s:string)=><span key={s} className="fx-badge fx-badge-purple">{s}</span>)}</div></div>
              <div><div className="text-[var(--fx-text-subtle)] mb-1">Link Base URL</div><div className="fx-mono text-[13px]">{process.env.NEXT_PUBLIC_APP_URL || "(set NEXT_PUBLIC_APP_URL)"} </div></div>
              <p className="text-[12px] text-[var(--fx-text-subtle)]">SMTP is configured via server env. Email/customer templates and send controls can be configured further as needed. For this demo, pre-alerts send to eligible recipients from the uploaded Excel.</p>
            </div>
          </div>
          <div className="fx-card">
            <div className="border-b border-[var(--fx-border)] px-5 py-4"><h3 className="text-[16px] font-semibold">Allow List (reference)</h3><p className="text-[13px] text-[var(--fx-text-subtle)]">Stored in Supabase; demo sending currently does not restrict by allow-list</p></div>
            <div className="overflow-auto"><table className="fx-table"><thead><tr><th>Email</th><th>Active</th></tr></thead><tbody>
              {allow.length ? allow.map((a:any)=><tr key={a.id}><td>{a.email}</td><td><span className={a.is_active?"fx-badge fx-badge-success":"fx-badge fx-badge-neutral"}>{a.is_active?"Active":"Inactive"}</span></td></tr>) : <tr><td colSpan={2} className="p-6 text-[13px] text-[var(--fx-text-subtle)]">No allow-list rows.</td></tr>}
            </tbody></table></div>
          </div>
        </div>
      </main>
    </>
  );
}
