"use client";
import { useEffect, useState } from "react";
import { Upload, Trash2, Save, RefreshCw, Download, FileText } from "lucide-react";

const CASES = ["NFBRK", "FEBRK_JEENA", "FEBRK_SUNIMPEX", "FEBRK", "DEFAULT"];

export function TemplatesManager() {
  const [caseKey, setCaseKey] = useState("NFBRK");
  const [templates, setTemplates] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState<any>({ case_key: "NFBRK", title: "", subject_template: "", intro_text: "", process_steps: "[]", required_docs: "[]" });

  const load = async (ck = caseKey) => {
    setLoading(true); setErr("");
    try {
      const [tRes, fRes] = await Promise.all([
        fetch("/api/admin/prealert-templates", { cache: "no-store" }),
        fetch(`/api/admin/prealert-template-files?caseKey=${encodeURIComponent(ck)}`, { cache: "no-store" }),
      ]);
      const tJ = await tRes.json().catch(() => ({}));
      const fJ = await fRes.json().catch(() => ({}));
      if (!tRes.ok) setErr(tJ.error || "Failed to load templates");
      if (!fRes.ok) setErr((p) => p || fJ.error || "Failed to load template files");
      const list = tJ.templates || [];
      setTemplates(list);
      setFiles(fJ.files || []);
      const found = list.find((t: any) => t.case_key === ck) || { case_key: ck, title: ck, subject_template: "", intro_text: "", process_steps: [], required_docs: [] };
      setForm({
        case_key: found.case_key,
        title: found.title || "",
        subject_template: found.subject_template || "",
        intro_text: found.intro_text || "",
        process_steps: JSON.stringify(found.process_steps || [], null, 2),
        required_docs: JSON.stringify(found.required_docs || [], null, 2),
        is_active: found.is_active !== false,
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(caseKey); }, [caseKey]);

  const saveConfig = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      let process_steps: any = [];
      let required_docs: any = [];
      try { process_steps = JSON.parse(form.process_steps || "[]"); } catch { throw new Error("Process Steps must be valid JSON array"); }
      try { required_docs = JSON.parse(form.required_docs || "[]"); } catch { throw new Error("Required Docs must be valid JSON array"); }
      const res = await fetch("/api/admin/prealert-templates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, process_steps, required_docs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Save failed"); else { setMsg("Template config saved."); load(caseKey); }
    } catch (e: any) { setErr(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const uploadFile = async (file: File | null) => {
    if (!file) return;
    setErr(""); setMsg("");
    const label = window.prompt("Label for this template/reference document (shown in customer link):", file.name.replace(/\.[^.]+$/, "")) || file.name;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caseKey", caseKey);
    fd.append("label", label);
    const res = await fetch("/api/admin/prealert-template-files", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || "Upload failed"); else { setMsg(`Uploaded ${file.name}`); load(caseKey); }
  };

  const deleteFile = async (id: string) => {
    if (!window.confirm("Delete this template file?")) return;
    const res = await fetch(`/api/admin/prealert-template-files?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || "Delete failed"); else load(caseKey);
  };

  return (
    <div className="space-y-4">
      <div className="fx-card p-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-[var(--fx-text-muted)]">Use case / template:</span>
        {CASES.map((c) => (
          <button key={c} className={caseKey === c ? "fx-btn fx-btn-primary fx-btn-sm" : "fx-btn fx-btn-secondary fx-btn-sm"} onClick={() => setCaseKey(c)}>{c}</button>
        ))}
        <button className="fx-btn fx-btn-secondary fx-btn-sm ml-auto" onClick={() => load(caseKey)} disabled={loading}><RefreshCw size={14}/> Refresh</button>
      </div>

      {err ? <div className="rounded-[12px] border border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] px-4 py-3 text-[13px] text-[var(--fx-danger)]">{err}</div> : null}
      {msg ? <div className="rounded-[12px] border border-[var(--fx-success-border)] bg-[var(--fx-success-bg)] px-4 py-3 text-[13px] text-[var(--fx-success)]">{msg}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="fx-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div><h3 className="text-[16px] font-semibold">Email & Process Config</h3><p className="text-[12px] text-[var(--fx-text-subtle)]">Used when sending pre-alerts for <b>{caseKey}</b> (NFBRK vs FEBRK templates differ).</p></div>
            <button className="fx-btn fx-btn-primary fx-btn-sm" onClick={saveConfig} disabled={saving}><Save size={14}/> {saving ? "Saving…" : "Save"}</button>
          </div>
          <label className="block text-[13px]"><span className="text-[var(--fx-text-subtle)]">Title</span><input className="fx-input mt-1" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} /></label>
          <label className="block text-[13px]"><span className="text-[var(--fx-text-subtle)]">Subject template (supports {"{{awb}}"}, {"{{company}}"}, {"{{end_result}}"})</span><input className="fx-input mt-1" value={form.subject_template||""} onChange={e=>setForm({...form,subject_template:e.target.value})} /></label>
          <label className="block text-[13px]"><span className="text-[var(--fx-text-subtle)]">Intro text (shown in email and customer link)</span><textarea className="fx-input mt-1 min-h-[90px]" value={form.intro_text||""} onChange={e=>setForm({...form,intro_text:e.target.value})} /></label>
          <label className="block text-[13px]"><span className="text-[var(--fx-text-subtle)]">Process steps (JSON array: [{"{title,text}"}])</span><textarea className="fx-input mt-1 min-h-[160px] fx-mono text-[12px]" value={form.process_steps||"[]"} onChange={e=>setForm({...form,process_steps:e.target.value})} /></label>
          <label className="block text-[13px]"><span className="text-[var(--fx-text-subtle)]">Required docs (JSON array: [{"{name,required,description,hints[]}"}]) — used in email & customer link, drives pending tracking</span><textarea className="fx-input mt-1 min-h-[180px] fx-mono text-[12px]" value={form.required_docs||"[]"} onChange={e=>setForm({...form,required_docs:e.target.value})} /></label>
        </div>

        <div className="fx-card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-[16px] font-semibold">Default Template Documents (Customer Link)</h3>
              <p className="text-[12px] text-[var(--fx-text-subtle)]">Upload PDFs/Excel/docs for <b>{caseKey}</b>. These are <b>not</b> attached to email — they are shown/downloaded in the secure customer link.</p>
            </div>
            <label className="fx-btn fx-btn-secondary fx-btn-sm cursor-pointer shrink-0">
              <Upload size={14}/> Upload file
              <input type="file" className="hidden" accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png" onChange={(e)=>{ uploadFile(e.target.files?.[0]||null); e.currentTarget.value=""; }} />
            </label>
          </div>
          <div className="space-y-2">
            {files.length ? files.map((f:any) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--fx-border)] px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-[13px] flex items-center gap-2"><FileText size={14} className="text-[var(--fx-purple-700)] shrink-0"/>{f.label || f.file_name}</div>
                  <div className="text-[12px] text-[var(--fx-text-subtle)] truncate">{f.file_name} · {f.case_key}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.download_url ? <a className="fx-btn fx-btn-secondary fx-btn-sm" href={f.download_url} target="_blank" rel="noreferrer"><Download size={13}/></a> : null}
                  <button className="fx-btn fx-btn-secondary fx-btn-sm" onClick={()=>deleteFile(f.id)} title="Delete"><Trash2 size={13}/></button>
                </div>
              </div>
            )) : <div className="rounded-[12px] border border-dashed border-[var(--fx-border)] p-6 text-center text-[13px] text-[var(--fx-text-subtle)]">No default template files for {caseKey}. Upload reference documents (KYC form, authorization format, etc.) as needed.</div>}
          </div>
          <div className="mt-4 rounded-[10px] bg-[#f8fafc] border border-[var(--fx-border)] p-3 text-[12px] text-[var(--fx-text-subtle)]">
            <b>How it works:</b> when you send a pre-alert, the email uses the case template (subject/process/required docs). The secure customer link shows the same process + required docs + pending status and lists these default files for download.
          </div>
        </div>
      </div>

      <div className="fx-card p-4 text-[13px] text-[var(--fx-text-muted)]">
        <b>Setup note:</b> run <span className="fx-mono">0003_prealert_templates.sql</span> in Supabase SQL Editor to enable DB-backed template configs/files. Until then, the app uses safe defaults and will show clear errors in admin APIs.
      </div>
    </div>
  );
}
