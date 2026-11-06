"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fmtDate } from "@/lib/utils";
import { FileText, Upload, CheckCircle2, AlertCircle, Download } from "lucide-react";

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

  if (err) return <div className="min-h-screen bg-[var(--fx-bg)] grid place-items-center p-6"><div className="fx-card max-w-[560px] p-8 text-center"><AlertCircle className="mx-auto mb-3 text-[var(--fx-danger)]" /><h1 className="text-[22px] font-semibold mb-2">This link is not valid</h1><p className="text-[var(--fx-text-subtle)]">{err}. Please use the link from your pre-alert email or contact FedEx Clearance Desk.</p></div></div>;
  if (!data) return <div className="min-h-screen bg-[var(--fx-bg)] grid place-items-center text-[var(--fx-text-subtle)]">Loading secure shipment package…</div>;

  const s = data.shipment;
  const template = data.template;
  const checklist = data.checklist || [];
  const pending = data.pendingRequired || checklist.filter((c: any) => c.required && c.status !== "UPLOADED").map((c: any) => c.name);
  const templateFiles = data.templateFiles || [];
  const documents = data.documents || [];

  return (
    <div className="min-h-screen bg-[var(--fx-bg)]">
      <header className="bg-[linear-gradient(90deg,var(--fx-purple-700),#6526a8)] text-white px-6 py-[18px]">
        <div className="max-w-[980px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-[10px] w-[10px] rounded-full bg-[var(--fx-orange-500)] shadow-[0_0_0_6px_rgba(255,102,0,.22)]" />
            <div><div className="font-semibold">FedEx Clearance Desk</div><div className="text-[12px] text-white/80">Secure shipment pre-alert & document upload</div></div>
          </div>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-white/70">AWB</div><div className="text-[18px] font-bold fx-mono">{s.awb}</div></div>
        </div>
      </header>

      <main className="max-w-[980px] mx-auto p-6 space-y-4">
        <section className="fx-card">
          <div className="p-5 border-b border-[var(--fx-border)]">
            <div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Shipment Package</div>
            <h2 className="text-[20px] font-semibold mt-1">{s.company_name || "Shipment"}</h2>
            <p className="text-[13px] text-[var(--fx-text-subtle)] mt-1">{template?.intro_text || "Review details, follow the process, and upload required clearance documents."}</p>
            {template?.title ? <div className="mt-2"><span className="fx-badge fx-badge-purple">{template.title}</span></div> : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {[ ["Consignee",s.consignee_name||s.company_name], ["Location",s.location], ["Clearance / End Result", s.end_result || s.clearance_type], ["Broker",s.broker||"Not applicable"], ["Freight",`${s.freight_value||"—"} ${s.currency||""}`], ["Contact Email",s.contact_email] ].map(([k,v])=> (
              <div key={String(k)}><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)]">{k}</div><div className="mt-1 font-medium">{String(v||"—")}</div></div>
            ))}
          </div>
        </section>

        {(template?.process_steps || []).length ? (
          <section className="fx-card p-5">
            <div className="mb-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Process</div><h3 className="text-[18px] font-semibold">What you need to do</h3></div>
            <ol className="space-y-2">
              {template.process_steps.map((step: any, i: number) => (
                <li key={i} className="flex gap-3 rounded-[12px] border border-[var(--fx-border)] px-4 py-3">
                  <div className="h-6 w-6 rounded-full bg-[var(--fx-purple-100,#f3ebff)] text-[var(--fx-purple-700)] text-[12px] font-bold grid place-items-center shrink-0">{i+1}</div>
                  <div><div className="font-semibold text-[14px]">{step.title}</div><div className="text-[13px] text-[var(--fx-text-muted)] mt-[2px]">{step.text}</div></div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="fx-card p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Documents to upload</div>
              <h3 className="text-[18px] font-semibold">Individual documents required from you ({template?.case_key || "case"})</h3>
              <p className="text-[13px] text-[var(--fx-text-subtle)]">This list is based on the pre-alert sent for your clearance case ({template?.title || template?.case_key || "—"}). Upload each applicable document below.</p>
            </div>
            <div className={pending.length ? "fx-badge fx-badge-warning" : "fx-badge fx-badge-success"}>
              {pending.length ? `${pending.length} required pending` : "Required docs received"}
            </div>
          </div>
          {pending.length ? (
            <div className="mb-3 rounded-[12px] border border-[var(--fx-warning-border)] bg-[var(--fx-warning-bg)] px-4 py-3 text-[13px] text-[#7a2e0e]">
              <b>Still pending (please upload):</b> {pending.join(", ")}
            </div>
          ) : null}
          {(["Required", "If applicable"] as const).map((section) => {
            const items = checklist.filter((c: any) => section === "Required" ? !!c.required : !c.required);
            if (!items.length) return null;
            return (
              <div key={section} className="mb-3 last:mb-0">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--fx-text-subtle)] mb-2">{section === "Required" ? "Required documents" : "If applicable / supporting documents"}</div>
                <div className="space-y-2">
                  {items.map((c: any) => {
                    const uploaded = c.status === "UPLOADED";
                    return (
                      <div key={c.name} className="flex items-start justify-between gap-3 border border-[var(--fx-border)] rounded-[12px] px-4 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-[14px] flex items-center gap-2">
                            {uploaded ? <CheckCircle2 size={16} className="text-[var(--fx-success)] shrink-0" /> : <FileText size={16} className="text-[var(--fx-text-subtle)] shrink-0" />}
                            {c.name}
                          </div>
                          <div className="text-[12px] text-[var(--fx-text-subtle)] mt-[2px]">
                            {c.description || (c.required ? "Required for clearance processing." : "Upload if applicable to your shipment.")}
                            {c.matched_file?.file_name ? ` · Received file: ${c.matched_file.file_name}` : ""}
                          </div>
                        </div>
                        <span className={uploaded ? "fx-badge fx-badge-success" : c.required ? "fx-badge fx-badge-warning" : "fx-badge fx-badge-neutral"}>
                          {uploaded ? "Uploaded" : c.required ? "Pending upload" : "Optional"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {templateFiles.length ? (
          <section className="fx-card p-5">
            <div className="mb-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Provided by FedEx / Templates</div><h3 className="text-[18px] font-semibold">Default documents for this case</h3><p className="text-[13px] text-[var(--fx-text-subtle)]">These reference/template files are provided for your clearance case. Download them from this secure link (not sent as email attachments).</p></div>
            <div className="space-y-2">
              {templateFiles.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between gap-3 border border-[var(--fx-border)] rounded-[12px] px-4 py-3">
                  <div><div className="font-medium text-[14px]">{f.label || f.file_name}</div><div className="text-[12px] text-[var(--fx-text-subtle)]">{f.file_name} · {f.case_key}</div></div>
                  {f.download_url ? <a className="fx-btn fx-btn-secondary fx-btn-sm" href={f.download_url} target="_blank" rel="noreferrer"><Download size={14}/> Download</a> : <span className="text-[12px] text-[var(--fx-text-subtle)]">Unavailable</span>}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="fx-card p-5">
          <div className="mb-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">Upload</div><h3 className="text-[18px] font-semibold">Upload your documents</h3><p className="text-[13px] text-[var(--fx-text-subtle)]">PDF, JPG, PNG, DOC/DOCX, XLS/XLSX. Uploads are logged against AWB {s.awb} and visible to Clearance Desk for tracking.</p></div>
          <div className="rounded-[14px] border-2 border-dashed border-[#c7b0e3] bg-[#fbf9ff] p-6 text-center">
            <input id="cu" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e=>upload(e.target.files)} />
            <label htmlFor="cu" className={`fx-btn fx-btn-primary cursor-pointer ${busy?"pointer-events-none opacity-60":""}`}><Upload size={16}/> {busy?"Uploading…":"Choose Files"}</label>
            {msg ? <div className="mt-3 text-[13px] text-[var(--fx-success)]">{msg}</div> : null}
          </div>
          {documents.length ? <div className="mt-4 space-y-2"><div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--fx-text-subtle)]">Uploaded by you / received</div>{documents.map((d:any)=><div key={d.id} className="flex items-center justify-between border border-[var(--fx-border)] rounded-[10px] px-3 py-2 text-[13px] gap-3"><span className="min-w-0"><b>{d.file_name}</b> <span className="text-[var(--fx-text-subtle)]">· {fmtDate(d.uploaded_at)}</span></span><span className="fx-badge fx-badge-success shrink-0">Received</span></div>)}</div> : null}
          <div className="mt-4 rounded-[10px] bg-[#f8fafc] border border-[var(--fx-border)] p-3 text-[12px] text-[var(--fx-text-subtle)]">This secure link is specific to AWB {s.awb}. Do not share it. Required documents still pending after upload may be followed up by the Clearance Desk team.</div>
        </section>
      </main>
      <footer className="text-center text-[12px] text-[var(--fx-text-subtle)] pb-6">FedEx Clearance Desk · Secure tokenized link · Case: {template?.case_key || "—"}</footer>
    </div>
  );
}
