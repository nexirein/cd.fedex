
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";
import { LINK_STATUS_META, PREFLIGHT_META, type LinkStatus, type PreflightResult } from "@/lib/rules";
import Link from "next/link";

export default async function ShipmentTracePage({ params }: { params: Promise<{ awb: string }> }) {
  const { awb } = await params;
  let s: any = null, events: any[] = [], docs: any[] = [], msgs: any[] = [], status: any = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("shipments").select("*, batches(id,batch_code,file_name)").eq("awb", awb).order("created_at", { ascending: false }).limit(1).maybeSingle();
    s = data;
    if (s) {
      const [{ data: e }, { data: d }, { data: m }, { data: vs }] = await Promise.all([
        supabase.from("shipment_events").select("*").eq("shipment_id", s.id).order("created_at", { ascending: false }),
        supabase.from("documents").select("*").eq("shipment_id", s.id).order("uploaded_at", { ascending: false }),
        supabase.from("messages").select("*").eq("shipment_id", s.id).order("created_at", { ascending: false }),
        supabase.from("v_shipment_link_status").select("*").eq("shipment_id", s.id).maybeSingle(),
      ]);
      events = e || []; docs = d || []; msgs = m || []; status = vs;
    }
  } catch {}
  if (!s) return <><Topbar title="Shipment not found" /><main className="p-6"><div className="fx-card p-10 text-center">No shipment found for AWB <span className="fx-mono">{awb}</span>. <Link href="/batches" className="text-[var(--fx-purple-700)] font-semibold">Batches</Link></div></main></>;
  const ls = LINK_STATUS_META[(status?.link_status as LinkStatus) || "NOT_SENT"] || LINK_STATUS_META.NOT_SENT;
  const pf = PREFLIGHT_META[(s.preflight_result as PreflightResult) || "SKIPPED"] || PREFLIGHT_META.SKIPPED;
  const link = s.link_token ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/c/${s.link_token}` : "";
  return (
    <>
      <Topbar title={`Shipment Trace · ${s.awb}`} subtitle={<><Link href="/batches" className="text-[var(--fx-purple-700)] hover:underline">Batches</Link> / {s.batches?.batch_code ? <Link href={`/batches/${s.batches.id}`} className="text-[var(--fx-purple-700)] hover:underline">{s.batches.batch_code}</Link> : "Batch"} / <span className="fx-mono">{s.awb}</span></>} />
      <main className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2"><span className={`fx-badge ${pf.badge}`}>{pf.label}</span><span className={`fx-badge ${ls.badge}`}>{ls.label}</span>{s.send_state==="SENT"?<span className="fx-badge fx-badge-success">SENT</span>:<span className="fx-badge fx-badge-neutral">NOT SENT</span>}</div>
        <div className={`rounded-[12px] border p-3 text-[13px] ${s.preflight_result==="PASS"?"border-[var(--fx-success-border)] bg-[var(--fx-success-bg)] text-[var(--fx-success)]":s.preflight_result==="BLOCKED"||s.preflight_result==="REJECTED"?"border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] text-[var(--fx-danger)]":"border-[var(--fx-warning-border)] bg-[var(--fx-warning-bg)] text-[#7a2e0e]"}`}><b>Pre-flight:</b> {s.preflight_reason}</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="fx-card p-5"><h3 className="text-[16px] font-semibold mb-3">Shipment Details</h3><div className="grid grid-cols-2 gap-3 text-[14px]">
            {[["AWB",s.awb,true],["Company",s.company_name],["Consignee",s.consignee_name],["Recipient",s.contact_email],["Email Source","Standard Remarks"],["End Result",s.end_result],["Broker",s.broker],["Location",s.location],["Freight",`${s.freight_value||"—"} ${s.currency||""}`],["Send State",s.send_state],["Sent At",fmtDate(s.sent_at)]].map(([k,v,m]:any)=><div key={k}><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)]">{k}</div><div className={`mt-[2px] font-medium ${m?"fx-mono":""}`}>{v||"—"}</div></div>)}
          </div>{link ? <div className="mt-4"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] mb-1">Customer Link</div><div className="rounded-[10px] border border-[var(--fx-border)] bg-[#f8fafc] p-2 fx-mono text-[12px] break-all">{link}</div><a href={link} target="_blank" rel="noreferrer" className="fx-btn fx-btn-secondary fx-btn-sm mt-2">Open Customer Portal</a></div> : null}</div>
          <div className="space-y-4">
            <div className="fx-card"><div className="border-b border-[var(--fx-border)] px-5 py-3 font-semibold">Documents ({docs.length})</div><div className="p-4">{docs.length?docs.map(d=><div key={d.id} className="flex justify-between gap-3 border-b border-[var(--fx-border)] py-2 text-[13px] last:border-0"><span><b>{d.file_name}</b> <span className="text-[var(--fx-text-subtle)]">· {d.source} · {fmtDate(d.uploaded_at)}</span></span><span className="fx-badge fx-badge-success">Received</span></div>):<div className="text-[13px] text-[var(--fx-text-subtle)]">No documents received.</div>}</div></div>
            <div className="fx-card"><div className="border-b border-[var(--fx-border)] px-5 py-3 font-semibold">Messages ({msgs.length})</div><div className="p-4">{msgs.length?msgs.map(m=><div key={m.id} className="border-b border-[var(--fx-border)] py-2 text-[13px] last:border-0"><div className="font-medium">{m.subject}</div><div className="text-[var(--fx-text-subtle)]">To {m.recipient} · {fmtDate(m.created_at)}</div><span className={m.status==="SENT"?"fx-badge fx-badge-success mt-1":"fx-badge fx-badge-danger mt-1"}>{m.status}</span></div>):<div className="text-[13px] text-[var(--fx-text-subtle)]">No messages.</div>}</div></div>
          </div>
        </div>
        <div className="fx-card"><div className="border-b border-[var(--fx-border)] px-5 py-3 font-semibold">Event Timeline</div><div className="p-4">{events.length?events.map(e=><div key={e.id} className="flex gap-3 py-2 border-b border-[var(--fx-border)] last:border-0"><div className="mt-[7px] h-[9px] w-[9px] rounded-full bg-[var(--fx-purple-700)] shrink-0"/><div><div className="text-[13px] font-semibold">{e.event_type}</div><div className="text-[12px] text-[var(--fx-text-subtle)]">{e.actor_type} · {fmtDate(e.created_at)} {e.detail ? `· ${JSON.stringify(e.detail)}` : ""}</div></div></div>):<div className="text-[13px] text-[var(--fx-text-subtle)]">No events.</div>}</div></div>
      </main>
    </>
  );
}
