"use client";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { fmtDate } from "@/lib/utils";
import { LINK_STATUS_META, PREFLIGHT_META, type LinkStatus, type PreflightResult } from "@/lib/rules";
import { FileSpreadsheet, Upload, CheckCircle2, XCircle, ArrowRight, Send, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";

type Step = 1 | 2 | 3;

export default function PreAlertFlowPage() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [sendResult, setSendResult] = useState<any>(null);

  const loadBatch = async (batchId: string) => {
    const res = await fetch(`/api/batches/${batchId}`, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setBatch(j.batch || null);
      setRows(j.rows || []);
      return j;
    } else if (j.error) {
      setErr((prev) => prev || j.error);
    }
    return j;
  };

  const sendPrealerts = async (batchId?: string) => {
    const id = batchId || batch?.id;
    if (!id) return;
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/batches/${id}/send-prealerts`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Failed to send pre-alerts."); return; }
      setSendResult(j);
      setStep(3);
      await loadBatch(id);
    } catch (e: any) {
      setErr(e?.message || "Network error while sending.");
    } finally {
      setLoading(false);
    }
  };

  const submitImport = async () => {
    if (!file) return;
    setLoading(true); setErr(""); setSendResult(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/batches/import", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Import failed. Please check the file and try again."); return; }
      setImportResult(j);
      setBatch(j.batch || null);
      setStep(2);
      if (j.batch?.id) {
        await loadBatch(j.batch.id);
        // Auto-send pre-alerts after successful upload/import (restrictions removed for now)
        await sendPrealerts(j.batch.id);
      } else if (j.rows) {
        setRows(j.rows.map((r: any, i: number) => ({ shipment_id: `local-${i}`, ...r })));
      }
    } catch (e: any) {
      setErr(e?.message || "Network error while importing.");
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const r = rows || [];
    return {
      total: r.length,
      pass: r.filter((x: any) => x.preflight_result === "PASS").length,
      blocked: r.filter((x: any) => x.preflight_result === "BLOCKED").length,
      skipped: r.filter((x: any) => x.preflight_result === "SKIPPED").length,
      rejected: r.filter((x: any) => x.preflight_result === "REJECTED").length,
      sent: r.filter((x: any) => x.send_state === "SENT").length,
      notOpened: r.filter((x: any) => x.link_status === "SENT_NOT_OPENED").length,
      docs: r.filter((x: any) => x.link_status === "DOCS_RECEIVED").length,
    };
  }, [rows]);

  const reset = () => { setStep(1); setFile(null); setErr(""); setImportResult(null); setBatch(null); setRows([]); setSendResult(null); };

  return (
    <>
      <Topbar
        title="Pre-Alert Flow"
        subtitle="Upload Excel → validate per AWB → pre-alerts are sent automatically (no restrictions for now)"
        actions={step > 1 ? <button className="fx-btn fx-btn-secondary fx-btn-sm" onClick={reset}>Start new import</button> : undefined}
      />
      <main className="fx-page space-y-5">
        <div className="fx-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              [1, "Upload & Validate"],
              [2, "Review Pre-flight"],
              [3, "Send Pre-alerts"],
            ].map(([n, label], i) => {
              const active = step === n;
              const done = step > (n as number);
              return (
                <div key={String(n)} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold border ${active ? "bg-[var(--fx-purple-700)] text-white border-[var(--fx-purple-700)]" : done ? "bg-[var(--fx-success-bg)] text-[var(--fx-success)] border-[var(--fx-success-border)]" : "bg-white text-[var(--fx-text-subtle)] border-[var(--fx-border)]"}`}>
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[11px]">{done ? "✓" : n}</span>
                    {label}
                  </div>
                  {i < 2 ? <div className="h-px w-6 bg-[var(--fx-border-strong)] hidden sm:block" /> : null}
                </div>
              );
            })}
            {batch ? <div className="ml-auto text-[13px] text-[var(--fx-text-subtle)]">Batch: <span className="fx-mono font-semibold text-[var(--fx-text)]">{batch.batch_code}</span></div> : null}
          </div>
        </div>

        {err ? <div className="flex items-start gap-2 rounded-[12px] border border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] p-3.5 text-[13px] text-[var(--fx-danger)]"><XCircle size={16} className="mt-0.5 shrink-0" /><div>{err}</div></div> : null}

        {step === 1 ? (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="fx-card overflow-hidden">
              <div className="fx-section-head"><div><h3 className="fx-section-title">1) Upload Excel</h3><p className="fx-section-sub">Upload UBOND/CONSOL file — validates each AWB and sends pre-alerts automatically</p></div></div>
              <div className="p-6">
                <label htmlFor="f" className={`block rounded-[16px] border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${file ? "border-[var(--fx-purple-600)] bg-[var(--fx-purple-50)]" : "border-[#c7b0e3] bg-[linear-gradient(180deg,#fbf9ff,#f8f5fc)] hover:border-[var(--fx-purple-600)]"}`}>
                  <input id="f" type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{ setFile(e.target.files?.[0]||null); setErr(""); }} />
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[14px] bg-white shadow-sm border border-[var(--fx-border)] text-[var(--fx-purple-700)]">{file ? <FileSpreadsheet size={26} /> : <Upload size={24} />}</div>
                  <div className="text-[17px] font-bold">{file ? file.name : "Select Excel file (.xlsx)"}</div>
                  <div className="text-[13px] text-[var(--fx-text-subtle)] mt-1">{file ? "Ready: validation + auto-send will run." : "Standard Remarks is used for consignee email"}</div>
                </label>
                <button className="fx-btn fx-btn-accent mt-5" onClick={submitImport} disabled={!file || loading}>
                  {loading ? "Processing (validate + send)…" : <>Upload, validate & send pre-alerts <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
            <div className="fx-card overflow-hidden h-fit">
              <div className="fx-section-head"><div><h3 className="fx-section-title">What happens in this flow</h3></div></div>
              <div className="p-6 space-y-3 text-[14px] text-[var(--fx-text-muted)]">
                <p><b className="text-[var(--fx-text)]">Step 1:</b> Excel is parsed and validated (AWB, Standard Remarks email, HOLD/CALLING/FEBRK rules).</p>
                <p><b className="text-[var(--fx-text)]">Step 2:</b> You review pre-flight PASS/BLOCKED/SKIPPED rows in the same screen.</p>
                <p><b className="text-[var(--fx-text)]">Step 3:</b> Pre-alerts are sent automatically for eligible <b className="text-[var(--fx-text)]">PASS</b> rows (restrictions removed for now). Tokens/links and tracking are created.</p>
                <div className="rounded-[12px] border border-[var(--fx-warning-border)] bg-[var(--fx-warning-bg)] p-3 text-[13px] text-[#7a2e0e] flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5"/>Upload triggers validation and auto-send in one flow. If any send fails, check SMTP env vars and the send result details.</div>
              </div>
            </div>
          </section>
        ) : null}

        {step >= 2 ? (
          <section className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {[
                ["Total", counts.total], ["PASS", counts.pass], ["Blocked", counts.blocked], ["Skipped", counts.skipped],
                ["Rejected", counts.rejected], ["Sent", counts.sent], ["Not opened", counts.notOpened], ["Docs received", counts.docs],
              ].map(([l,v]) => (
                <div key={String(l)} className="fx-card p-3.5"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">{l}</div><div className="mt-1 text-[22px] font-extrabold">{v as any}</div></div>
              ))}
            </div>

            <div className="fx-card overflow-hidden">
              <div className="fx-section-head flex-wrap">
                <div>
                  <h3 className="fx-section-title">2) Review pre-flight (per AWB)</h3>
                  <p className="fx-section-sub">Each AWB is listed below with its specific result and reason. {importResult?.summary?.sheetName ? <>Sheet: <b>{importResult.summary.sheetName}</b>.</> : null}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="fx-btn fx-btn-secondary fx-btn-sm" onClick={() => batch?.id && loadBatch(batch.id)} disabled={loading || !batch?.id}><RefreshCw size={14}/> Refresh</button>
                  {step === 2 ? <button className="fx-btn fx-btn-accent" onClick={() => sendPrealerts()} disabled={loading || !batch?.id || counts.pass === 0}>{loading ? "Sending…" : <><Send size={16}/> Send pre-alerts now</>}</button> : null}
                </div>
              </div>
              <div className="p-4 md:p-5 space-y-3 max-h-[62vh] overflow-auto bg-[var(--fx-surface-2)]/40">
                {(() => {
                  const order: Record<string, number> = { REJECTED: 0, BLOCKED: 1, SKIPPED: 2, PASS: 3 };
                  const sorted = [...rows].sort((a, b) => (order[a.preflight_result] ?? 9) - (order[b.preflight_result] ?? 9));
                  if (!sorted.length) return <div className="p-8 text-center text-[var(--fx-text-subtle)]">No rows to display.</div>;
                  return sorted.map((r: any, idx: number) => {
                    const pf = PREFLIGHT_META[(r.preflight_result as PreflightResult) || "SKIPPED"] || PREFLIGHT_META.SKIPPED;
                    const ls = LINK_STATUS_META[(r.link_status as LinkStatus) || "NOT_SENT"] || LINK_STATUS_META.NOT_SENT;
                    const isIssue = r.preflight_result !== "PASS";
                    return (
                      <div key={r.shipment_id || r.awb || idx} className={`rounded-[14px] border bg-white p-4 ${isIssue ? "border-[var(--fx-border-strong)]" : "border-[var(--fx-border)]"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--fx-text-subtle)]">AWB</span>
                              <span className="fx-mono text-[16px] font-extrabold text-[var(--fx-text)]">{r.awb || "—"}</span>
                              <span className={`fx-badge ${pf.badge}`}>{pf.label}</span>
                              {r.send_state === "SENT" ? <span className="fx-badge fx-badge-success">SENT</span> : null}
                              {r.link_status ? <span className={`fx-badge ${ls.badge}`}>{ls.label}</span> : null}
                            </div>
                            <div className="mt-1 text-[13px] text-[var(--fx-text-muted)]">
                              {r.company_name || "—"}{r.contact_email ? <> · {r.contact_email}</> : null}{r.end_result ? <> · {r.end_result}</> : null}
                            </div>
                          </div>
                        </div>
                        <div className={`mt-3 rounded-[10px] border px-3 py-2.5 text-[13px] ${r.preflight_result === "PASS" ? "border-[var(--fx-success-border)] bg-[var(--fx-success-bg)] text-[var(--fx-success)]" : r.preflight_result === "REJECTED" || r.preflight_result === "BLOCKED" ? "border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] text-[var(--fx-danger)]" : "border-[var(--fx-warning-border)] bg-[var(--fx-warning-bg)] text-[#7a2e0e]"}`}>
                          <b>{r.preflight_result === "PASS" ? "Ready:" : "Issue for this AWB:"}</b> {r.preflight_reason || "No reason provided."}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="border-t border-[var(--fx-border)] px-5 py-3 text-[12px] text-[var(--fx-text-subtle)]">
                Eligible <b>PASS</b> rows with sendable end results and a recipient email are sent (restrictions removed for now). Pre-alerts auto-send after upload; use “Send pre-alerts now” to retry if needed.
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="fx-card overflow-hidden border-l-4 border-l-[var(--fx-success)]">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--fx-success-bg)] text-[var(--fx-success)]"><CheckCircle2 size={22} /></div>
                <div className="flex-1">
                  <h3 className="text-[20px] font-extrabold">Pre-alert step completed</h3>
                  <p className="text-[14px] text-[var(--fx-text-subtle)] mt-1">Batch <span className="fx-mono font-semibold text-[var(--fx-text)]">{batch?.batch_code}</span> processed in one flow (import → review → send).</p>
                  {sendResult ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {[["Sent", sendResult.sent],["Blocked", sendResult.blocked],["Already sent", sendResult.skipped],["Failed", sendResult.failed],["Mode", sendResult.testMode ? "Restricted" : "Demo (open)"]].map(([l,v]) => (
                        <div key={String(l)} className="rounded-[12px] border border-[var(--fx-border)] bg-[var(--fx-surface-2)] p-3"><div className="text-[11px] uppercase tracking-wide text-[var(--fx-text-subtle)] font-semibold">{l}</div><div className="text-[22px] font-extrabold mt-1">{String(v)}</div></div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="fx-btn fx-btn-primary" onClick={reset}>Run another pre-alert flow</button>
                    {batch?.id ? <a className="fx-btn fx-btn-secondary" href={`/batches/${batch.id}`}>Open batch details</a> : null}
                    <a className="fx-btn fx-btn-secondary" href="/admin/links">View link open dashboard</a>
                  </div>
                  <div className="mt-4 flex items-start gap-2 text-[13px] text-[var(--fx-text-muted)]"><ShieldCheck size={16} className="mt-0.5 text-[var(--fx-purple-700)]"/> Pre-alerts are sent to eligible recipients from the uploaded Excel (demo: restrictions removed). Customer opens/uploads can be tracked from the dashboard and shipment trace.</div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
