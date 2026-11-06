import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { LinksTableClient } from "./LinksTableClient";

export default async function AdminLinkDashboardPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = sp.status || "ALL";
  const q = (sp.q || "").toLowerCase();
  let rows: any[] = [], stats = { total: 0, sent: 0, opened: 0, notOpened: 0, awaiting: 0, docs: 0 };
  try {
    const supabase = await createClient();
    let query = supabase.from("v_admin_link_open_dashboard").select("*").order("sent_at", { ascending: false, nullsFirst: false });
    if (status !== "ALL") query = query.eq("link_status", status);
    const { data } = await query.limit(500);
    rows = (data || []).filter((r: any) => !q || `${r.awb} ${r.company_name} ${r.contact_email} ${r.batch_code}`.toLowerCase().includes(q));
    const all = data || [];
    stats.total = all.length;
    all.forEach((r: any) => {
      if (r.link_status !== "NOT_SENT") stats.sent++;
      if (r.link_status === "SENT_NOT_OPENED") stats.notOpened++;
      if (r.link_status === "LINK_OPENED_AWAITING_DOCS") { stats.opened++; stats.awaiting++; }
      if (r.link_status === "DOCS_RECEIVED") { stats.opened++; stats.docs++; }
    });
  } catch {}
  const openRate = stats.sent ? Math.round(((stats.opened) / stats.sent) * 100) : 0;
  const filters = [["ALL","All"],["NOT_SENT","Not Sent"],["SENT_NOT_OPENED","Sent · Not Opened"],["LINK_OPENED_AWAITING_DOCS","Link Opened · Awaiting Docs"],["DOCS_RECEIVED","Docs Received"]];
  return (
    <>
      <Topbar title="Link Open Dashboard" subtitle="Select shipments (all or individual) and click Send pre-alerts. Track who opened and who uploaded docs." />
      <main className="p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 mb-4">
          {[["Shipments",stats.total],["Sent",stats.sent],["Not Opened",stats.notOpened],["Opened",stats.opened],["Docs Received",stats.docs],["Open Rate",`${openRate}%`]].map(([l,v]) => (
            <div key={String(l)} className="fx-card p-4"><div className="text-[12px] text-[var(--fx-text-subtle)]">{l}</div><div className="mt-1 text-[26px] font-bold text-[var(--fx-purple-700)]">{v}</div></div>
          ))}
        </div>
        <div className="fx-card mb-4">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filters.map(([k,l]) => <a key={k} href={`/admin/links?status=${k}${q?`&q=${encodeURIComponent(q)}`:""}`} className={status===k?"fx-btn fx-btn-primary fx-btn-sm":"fx-btn fx-btn-secondary fx-btn-sm"}>{l}</a>)}
            </div>
            <form className="flex gap-2" action="/admin/links" method="get">
              <input type="hidden" name="status" value={status} />
              <input name="q" defaultValue={sp.q||""} className="fx-input w-[260px]" placeholder="Search AWB, company, email, batch…" />
              <button className="fx-btn fx-btn-secondary fx-btn-sm" type="submit">Search</button>
            </form>
          </div>
        </div>
        <LinksTableClient rows={rows} />
      </main>
    </>
  );
}
