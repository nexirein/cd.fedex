"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fmtDate } from "@/lib/utils";

export default function CustomerPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!token) return;
    setErr("");
    const res = await fetch(`/api/customer/${token}`, { cache: "no-store" });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) setErr(j.error || "Invalid link"); else setData(j);
  };
  useEffect(() => { load(); }, [token]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !token) return;
    setBusy(true); setMsg("");
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/customer/${token}/documents`, { method: "POST", body: fd });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) setMsg(j.error || `Failed: ${file.name}`); else setMsg(`Uploaded ${file.name}`);
    }
    setBusy(false);
    load();
  };

  if (err) return <div className="min-h-screen bg-[var(--fx-bg)] grid place-items-center p-6"><div className="fx-card max-w-[560px] p-8 text-center"><h1 className="text-[22px] font-semibold mb-2">This link is not valid</h1><p className="text-[var(--fx-text-subtle)]">{err}. Please use the link from your pre-alert email or contact FedEx Clearance Desk.</p></div></div>;
  if (!data) return <div className="min-h-screen bg-[var(--fx-bg)] grid place-items-center text-[var(--fx-text-subtle)]">Loading secure shipment package…</div>;
  const s = data.shipment;
  return (
    <div className="min-h-screen bg-[var(--fx-bg)]">
      <header className="bg-[linear-gradient(90deg,var(--fx-purple-700),#6526a8)] text-white px-6 py-[18px]">
        <div className="max-w-[980px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3"><div className="h-[10px] w-[10px] rounded-full bg-[var(--fx-orange-500)] shadow-[0_0_0_6px_rgba(255,102,0,.22)]" /><div><div className="font-semibold">FedEx Clearance Desk</div><div className="text-[12px] text-white/80">Secure document upload</div></div></div>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-white/70">AWB</div><div className="text-[18px] font-bold fx-mono">{s.awb}</div></div>
        </div>
      </header>
      <main className="max-w-[980px] mx-auto p-6 space-y-4">
        <section className="fx-card">
          <div className="p-5 border-b border-[var(--fx-border)]"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Shipment Package</div><h2 className="text-[20px] font-semibold mt-1">{s.company_name || "Shipment"}</h2><p className="text-[13px] text-[var(--fx-text-subtle)]">Review details and upload required clearance documents.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {[["Consignee",s.consignee_name||s.company_name],["Location",s.location],["Clearance Type",s.clearance_type||s.end_result],["Broker",s.broker||"Not applicable"],["Freight",`${s.freight_value||"—"} ${s.currency||""}`],["Contact Email",s.contact_email]].map(([k,v])=> (
              <div key={String(k)}><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)]">{k}</div><div className="mt-1 font-medium">{String(v||"—")}</div></div>
            ))}
          </div>
        </section>
        <section className="fx-card p-5">
          <div className="mb-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Document Checklist</div><h3 className="text-[18px] font-semibold">Required Documents</h3></div>
          <div className="space-y-2">
            {(data.checklist||[]).map((c:any)=>(<div key={c.name} className="flex items-center justify-between gap-3 border border-[var(--fx-border)] rounded-[12px] px-4 py-3"><div><div className="font-medium text-[14px]">{c.name}</div><div className="text-[12px] text-[var(--fx-text-subtle)]">{c.required?"Required for clearance":"Reference"}</div></div><span className={c.status==="UPLOADED"?"fx-badge fx-badge-success":"fx-badge fx-badge-warning"}>{c.status==="UPLOADED"?"Uploaded":"Required"}</span></div>))}
          </div>
        </section>
        <section className="fx-card p-5">
          <div className="mb-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Upload</div><h3 className="text-[18px] font-semibold">Upload Documents</h3><p className="text-[13px] text-[var(--fx-text-subtle)]">PDF, JPG, PNG, DOC/DOCX. Uploads are logged against your AWB.</p></div>
          <div className="rounded-[14px] border-2 border-dashed border-[#c7b0e3] bg-[#fbf9ff] p-6 text-center">
            <input id="cu" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e=>upload(e.target.files)} />
            <label htmlFor="cu" className={`fx-btn fx-btn-primary cursor-pointer ${busy?"pointer-events-none opacity-60":""}`}>{busy?"Uploading…":"Choose Files"}</label>
            {msg ? <div className="mt-3 text-[13px] text-[var(--fx-success)]">{msg}</div> : null}
          </div>
          {(data.documents||[]).length ? <div className="mt-4 space-y-2"><div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--fx-text-subtle)]">Uploaded</div>{data.documents.map((d:any)=><div key={d.id} className="flex items-center justify-between border border-[var(--fx-border)] rounded-[10px] px-3 py-2 text-[13px]"><span><b>{d.file_name}</b> <span className="text-[var(--fx-text-subtle)]">· {fmtDate(d.uploaded_at)}</span></span><span className="fx-badge fx-badge-success">Received</span></div>)}</div> : null}
          <div className="mt-4 rounded-[10px] bg-[#f8fafc] border border-[var(--fx-border)] p-3 text-[12px] text-[var(--fx-text-subtle)]">This secure link is specific to AWB {s.awb}. Do not share this link.</div>
        </section>
      </main>
      <footer className="text-center text-[12px] text-[var(--fx-text-subtle)] pb-6">FedEx Clearance Desk · Secure tokenized link</footer>
    </div>
  );
}
