
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";
import { LINK_STATUS_META, type LinkStatus } from "@/lib/rules";
import Link from "next/link";
import { ArrowRight, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  let batchesCount = 0, shipmentsCount = 0, sentCount = 0, openedCount = 0, docsCount = 0, recent: any[] = [], attention: any[] = [], notOpened = 0;
  try {
    const supabase = await createClient();
    const [{ count: bc }, { count: sc }] = await Promise.all([
      supabase.from("batches").select("*", { count: "exact", head: true }),
      supabase.from("shipments").select("*", { count: "exact", head: true }),
    ]);
    batchesCount = bc || 0; shipmentsCount = sc || 0;
    const { data: vs } = await supabase.from("v_shipment_link_status").select("link_status,awb,company_name,batch_id,contact_email,sent_at");
    (vs || []).forEach((r: any) => {
      if (r.link_status !== "NOT_SENT") sentCount++;
      if (r.link_status === "SENT_NOT_OPENED") notOpened++;
      if (r.link_status === "LINK_OPENED_AWAITING_DOCS" || r.link_status === "DOCS_RECEIVED") openedCount++;
      if (r.link_status === "DOCS_RECEIVED") docsCount++;
    });
    attention = (vs || []).filter((r: any) => r.link_status === "SENT_NOT_OPENED" || r.link_status === "LINK_OPENED_AWAITING_DOCS").slice(0, 8);
    const { data: rb } = await supabase.from("batches").select("id,batch_code,file_name,kind,created_at").order("created_at", { ascending: false }).limit(6);
    recent = rb || [];
  } catch {}
  const cards = [
    { label: "Batches", value: batchesCount, meta: "Imported workbooks", href: "/batches" },
    { label: "Shipments", value: shipmentsCount, meta: "Across all batches", href: "/batches" },
    { label: "Pre-alerts sent", value: sentCount, meta: "Controlled by TEST MODE/allow-list", href: "/admin/links" },
    { label: "Sent · not opened", value: notOpened, meta: "Needs follow-up", href: "/admin/links?status=SENT_NOT_OPENED" },
    { label: "Docs received", value: docsCount, meta: "Portal uploads logged", href: "/admin/links?status=DOCS_RECEIVED" },
  ];
  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Track pre-alerts, link opens, and document uploads across clearance batches"
        actions={<Link href="/import" className="fx-btn fx-btn-accent"><FileUp size={16} /> Import Batch</Link>}
      />
      <main className="fx-page space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="fx-card fx-stat block hover:shadow-[var(--fx-shadow)] transition-shadow">
              <div className="fx-stat-label">{c.label}</div>
              <div className="fx-stat-value">{c.value}</div>
              <div className="fx-stat-meta">{c.meta}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section className="fx-card overflow-hidden">
            <div className="fx-section-head">
              <div><h3 className="fx-section-title">Recent batches</h3><p className="fx-section-sub">Open a batch to validate, send pre-alerts, and monitor status</p></div>
              <Link href="/batches" className="fx-btn fx-btn-secondary fx-btn-sm">View all</Link>
            </div>
            {recent.length ? (
              <div className="overflow-auto">
                <table className="fx-table">
                  <thead><tr><th>Batch</th><th>Type</th><th>File</th><th>Created</th><th></th></tr></thead>
                  <tbody>
                    {recent.map((b: any) => (
                      <tr key={b.id}>
                        <td><Link href={`/batches/${b.id}`} className="font-semibold text-[var(--fx-purple-700)] hover:underline">{b.batch_code}</Link></td>
                        <td><span className="fx-badge fx-badge-purple">{b.kind || "—"}</span></td>
                        <td className="max-w-[260px] truncate text-[var(--fx-text-muted)]" title={b.file_name}>{b.file_name}</td>
                        <td className="text-[var(--fx-text-subtle)]">{fmtDate(b.created_at)}</td>
                        <td className="text-right"><Link href={`/batches/${b.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--fx-purple-700)] hover:underline">Open <ArrowRight size={14} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fx-empty">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--fx-purple-100)] text-[var(--fx-purple-700)]"><FileUp size={20} /></div>
                <p className="font-semibold text-[var(--fx-text)]">No batches yet</p>
                <p className="mt-1 mb-4">Import a UBOND/CONSOL workbook to validate rows and start sending pre-alerts.</p>
                <Link href="/import" className="fx-btn fx-btn-primary">Import Batch</Link>
              </div>
            )}
          </section>

          <section className="fx-card overflow-hidden">
            <div className="fx-section-head">
              <div><h3 className="fx-section-title">Needs attention</h3><p className="fx-section-sub">Sent but not opened, or opened awaiting documents</p></div>
              <Link href="/admin/links" className="fx-btn fx-btn-secondary fx-btn-sm">Dashboard</Link>
            </div>
            {attention.length ? (
              <div className="divide-y divide-[var(--fx-border)]">
                {attention.map((r: any) => {
                  const meta = LINK_STATUS_META[r.link_status as LinkStatus] || LINK_STATUS_META.NOT_SENT;
                  return (
                    <Link key={`${r.awb}-${r.batch_id}`} href={`/shipments/${r.awb}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#faf8ff] transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="fx-mono text-[13px] font-bold">{r.awb}</span><span className={`fx-badge ${meta.badge}`}>{meta.label}</span></div>
                        <div className="mt-0.5 truncate text-[13px] text-[var(--fx-text-subtle)]">{r.company_name || "—"} · {r.contact_email || "No recipient"}</div>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-[var(--fx-text-subtle)]" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="fx-empty">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--fx-success-bg)] text-[var(--fx-success)]"><CheckCircle2 size={20} /></div>
                <p className="font-semibold text-[var(--fx-text)]">No pending customer action</p>
                <p className="mt-1">When pre-alerts are sent, shipments awaiting opens or uploads will appear here.</p>
              </div>
            )}
          </section>
        </div>

        <div className="fx-card p-4 flex flex-wrap items-center gap-3 text-[13px] border-l-4 border-l-[var(--fx-orange-500)]">
          <AlertCircle size={16} className="text-[var(--fx-warning)] shrink-0" />
          <span className="text-[var(--fx-text-muted)]"><b className="text-[var(--fx-text)]">TEST MODE active.</b> Outbound pre-alerts are sent only to allow-listed recipients. Link generation, customer portal, and status tracking work normally for eligible rows.</span>
          <Link href="/admin/settings" className="ml-auto font-semibold text-[var(--fx-purple-700)] hover:underline">View settings</Link>
        </div>
      </main>
    </>
  );
}
