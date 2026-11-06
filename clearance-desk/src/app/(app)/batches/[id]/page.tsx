
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";
import { LINK_STATUS_META, PREFLIGHT_META, type LinkStatus, type PreflightResult } from "@/lib/rules";
import { BatchActions } from "./BatchActions";
import Link from "next/link";

export default async function BatchBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let batch: any = null, rows: any[] = [];
  try {
    const supabase = await createClient();
    const { data: b } = await supabase.from("batches").select("*").eq("id", id).single();
    batch = b;
    const { data } = await supabase.from("v_shipment_link_status").select("*").eq("batch_id", id).order("awb");
    rows = data || [];
  } catch {}
  if (!batch) return <><Topbar title="Batch not found" /><main className="p-6"><div className="fx-card p-10 text-center">Batch not found. <Link href="/batches" className="text-[var(--fx-purple-700)] font-semibold">Back to batches</Link></div></main></>;
  const counts = { total: rows.length, pass: rows.filter(r=>r.preflight_result==="PASS").length, sent: rows.filter(r=>r.send_state==="SENT").length, notOpened: rows.filter(r=>r.link_status==="SENT_NOT_OPENED").length, docs: rows.filter(r=>r.link_status==="DOCS_RECEIVED").length };
  return (
    <>
      <Topbar title={batch.batch_code} subtitle={<><Link href="/batches" className="text-[var(--fx-purple-700)] hover:underline">Batches</Link> / {batch.file_name} · {fmtDate(batch.created_at)}</>} actions={<BatchActions batchId={id} />} />
      <main className="p-6">
        <div className="mb-4 rounded-[12px] border border-[var(--fx-warning-border)] bg-[var(--fx-warning-bg)] px-4 py-3 text-[13px] text-[#7a2e0e]"><b>Demo mode:</b> pre-alerts are sent to recipients from the batch (restrictions removed for demo). Tokenized links and tracking are active for eligible rows.</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-4">
          {[["Rows",counts.total],["Pre-flight PASS",counts.pass],["Sent",counts.sent],["Sent · Not Opened",counts.notOpened],["Docs Received",counts.docs]].map(([l,v])=> (
            <div key={String(l)} className="fx-card p-4"><div className="text-[12px] text-[var(--fx-text-subtle)]">{l}</div><div className="mt-1 text-[26px] font-bold text-[var(--fx-purple-700)]">{v}</div></div>
          ))}
        </div>
        <div className="fx-card">
          <div className="border-b border-[var(--fx-border)] px-5 py-4"><h3 className="text-[16px] font-semibold">Batch Board</h3><p className="text-[13px] text-[var(--fx-text-subtle)]">Pre-flight, send state, and customer link status per shipment</p></div>
          <div className="overflow-auto">
            <table className="fx-table">
              <thead><tr><th>AWB</th><th>Company</th><th>Recipient (Standard Remarks)</th><th>End Result</th><th>Broker</th><th>Pre-flight</th><th>Send</th><th>Link Status</th><th>Opened</th><th>Docs</th></tr></thead>
              <tbody>
                {rows.map(r => {
                  const ls = LINK_STATUS_META[r.link_status as LinkStatus] || LINK_STATUS_META.NOT_SENT;
                  const pf = PREFLIGHT_META[r.preflight_result as PreflightResult] || PREFLIGHT_META.SKIPPED;
                  return (
                    <tr key={r.shipment_id}>
                      <td className="fx-mono font-semibold"><Link href={`/shipments/${r.awb}`} className="text-[var(--fx-purple-700)] hover:underline">{r.awb}</Link></td>
                      <td>{r.company_name||"—"}</td>
                      <td className="text-[13px]">{r.contact_email || <span className="fx-badge fx-badge-danger">Missing</span>}</td>
                      <td>{r.end_result||"—"}</td>
                      <td>{r.broker||"—"}</td>
                      <td><span className={`fx-badge ${pf.badge}`} title={r.preflight_reason||""}>{pf.label}</span></td>
                      <td>{r.send_state==="SENT"?<span className="fx-badge fx-badge-success">SENT</span>:<span className="fx-badge fx-badge-neutral">NOT SENT</span>}</td>
                      <td><span className={`fx-badge ${ls.badge}`}>{ls.label}</span></td>
                      <td className="text-[13px] text-[var(--fx-text-subtle)]">{fmtDate(r.link_opened_at)}</td>
                      <td>{r.doc_count||0}</td>
                    </tr>
                  );
                })}
                {!rows.length ? <tr><td colSpan={10} className="p-8 text-center text-[var(--fx-text-subtle)]">No shipments in this batch.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
