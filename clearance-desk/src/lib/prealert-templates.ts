import type { SupabaseClient } from "@supabase/supabase-js";

export type TemplateStep = { title: string; text: string };
export type RequiredDoc = { name: string; required?: boolean; description?: string; hints?: string[] };
export type TemplateConfig = {
  case_key: string; title: string; subject_template: string; intro_text: string;
  process_steps: TemplateStep[]; required_docs: RequiredDoc[]; is_active?: boolean;
};

export type TemplateFile = {
  id: string; case_key: string; label: string; file_name: string; content_type?: string | null;
  storage_bucket: string; storage_path: string; download_url?: string | null;
};

export function resolveTemplateCaseKey(shipment: any): string {
  const er = String(shipment?.end_result || "").toUpperCase().trim();
  const broker = String(shipment?.broker || "").toUpperCase().trim();
  if (er === "NFBRK") return "NFBRK";
  if (er === "FEBRK-JEENA" || (er.startsWith("FEBRK") && broker === "JEENA")) return "FEBRK_JEENA";
  if (er === "FEBRK-SUNIMPEX" || (er.startsWith("FEBRK") && broker === "SUNIMPEX")) return "FEBRK_SUNIMPEX";
  if (er.startsWith("FEBRK")) return "FEBRK";
  return "DEFAULT";
}

function renderSubject(tpl: string, shipment: any) {
  return tpl
    .replaceAll("{{awb}}", String(shipment?.awb || ""))
    .replaceAll("{{company}}", String(shipment?.company_name || "Shipment"))
    .replaceAll("{{end_result}}", String(shipment?.end_result || ""));
}

const DEFAULT_CONFIG: TemplateConfig = {
  case_key: "DEFAULT",
  title: "Pre-Alert – Document Upload Required",
  subject_template: "FedEx Clearance: Action required for AWB {{awb}}",
  intro_text: "Please review your shipment and upload required clearance documents using the secure link.",
  process_steps: [
    { title: "Open secure link", text: "Use the shipment-specific secure link." },
    { title: "Upload required documents", text: "Upload all required documents listed in the portal." },
  ],
  required_docs: [
    { name: "Commercial Invoice", required: true, hints: ["invoice"] },
    { name: "Packing List", required: true, hints: ["packing", "pack"] },
    { name: "KYC Document", required: true, hints: ["kyc", "id", "passport", "pan", "aadhar"] },
  ],
};

export async function getTemplateForShipment(admin: SupabaseClient, shipment: any): Promise<TemplateConfig & { subject: string }> {
  const key = resolveTemplateCaseKey(shipment);
  const keys = [key, "DEFAULT"];
  const { data } = await admin
    .from("prealert_template_configs")
    .select("*")
    .in("case_key", keys)
    .eq("is_active", true);
  const byKey = new Map((data || []).map((r: any) => [r.case_key, r]));
  const cfg = (byKey.get(key) || byKey.get("DEFAULT") || DEFAULT_CONFIG) as TemplateConfig;
  return { ...cfg, process_steps: Array.isArray(cfg.process_steps) ? cfg.process_steps : DEFAULT_CONFIG.process_steps, required_docs: Array.isArray(cfg.required_docs) ? cfg.required_docs : DEFAULT_CONFIG.required_docs, subject: renderSubject(cfg.subject_template || DEFAULT_CONFIG.subject_template, shipment) };
}

export async function getTemplateFiles(admin: SupabaseClient, caseKey: string): Promise<TemplateFile[]> {
  const keys = [caseKey, "DEFAULT"];
  const { data } = await admin
    .from("prealert_template_files")
    .select("id,case_key,label,file_name,content_type,storage_bucket,storage_path")
    .in("case_key", keys)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const files = (data || []) as TemplateFile[];
  // signed URLs (private bucket) - best effort
  const out: TemplateFile[] = [];
  for (const f of files) {
    try {
      const { data: s } = await admin.storage.from(f.storage_bucket || "clearance-documents").createSignedUrl(f.storage_path, 60 * 60); // 1 hour
      out.push({ ...f, download_url: s?.signedUrl || null });
    } catch {
      out.push({ ...f, download_url: null });
    }
  }
  return out;
}

export function computeChecklistStatus(requiredDocs: RequiredDoc[], uploadedDocs: any[]) {
  const checklist = (requiredDocs || []).map((item) => {
    const name = item.name || "Document";
    const hints = (item.hints && item.hints.length ? item.hints : [name.toLowerCase().split(" ")[0]]).map((h) => String(h).toLowerCase());
    const match = (uploadedDocs || []).find((d: any) => {
      const fn = String(d.file_name || "").toLowerCase();
      return hints.some((h) => h && fn.includes(h));
    });
    return {
      name,
      required: !!item.required,
      description: item.description || "",
      status: match ? "UPLOADED" : (item.required ? "PENDING" : "OPTIONAL"),
      matched_file: match ? { id: match.id, file_name: match.file_name, uploaded_at: match.uploaded_at } : null,
    };
  });
  const pendingRequired = checklist.filter((c) => c.required && c.status === "PENDING").map((c) => c.name);
  return { checklist, pendingRequired, allRequiredReceived: pendingRequired.length === 0 && checklist.some((c) => c.required) };
}

export function renderPrealertEmailHtml(args: { shipment: any; link: string; template: TemplateConfig & { subject: string }; templateFiles?: TemplateFile[] }) {
  const { shipment: s, link, template } = args;
  const steps = (template.process_steps || []).slice(0, 6);
  const docs = (template.required_docs || []).slice(0, 12);
  const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Inter,Arial,sans-serif;color:#101828;max-width:640px;line-height:1.45">
    <h2 style="color:#4D148C;margin:0 0 8px">FedEx Clearance Desk</h2>
    <p style="margin:0 0 12px">${esc(template.intro_text)}</p>
    <div style="background:#F9FAFB;border:1px solid #EAECF0;border-radius:12px;padding:14px 16px;margin:0 0 14px">
      <p style="margin:0"><b>AWB:</b> ${esc(s.awb)}<br/>
      <b>Company:</b> ${esc(s.company_name || "—")}<br/>
      <b>Consignee:</b> ${esc(s.consignee_name || s.company_name || "—")}<br/>
      <b>Clearance / End Result:</b> ${esc(s.clearance_type || s.end_result || "—")}${s.broker ? `<br/><b>Broker:</b> ${esc(s.broker)}` : ""}<br/>
      <b>Case:</b> ${esc(template.title || template.case_key)}</p>
    </div>
    <div style="margin:0 0 14px">
      <h3 style="margin:0 0 8px;font-size:15px;color:#344054">Process</h3>
      <ol style="margin:0;padding-left:20px;color:#344054">${steps.map(st => `<li style="margin:0 0 6px"><b>${esc(st.title)}:</b> ${esc(st.text)}</li>`).join("") || "<li>Open the secure link and upload required documents.</li>"}</ol>
    </div>
    <div style="margin:0 0 16px">
      <h3 style="margin:0 0 8px;font-size:15px;color:#344054">Required documents (${template.case_key})</h3>
      <ul style="margin:0;padding-left:20px;color:#344054">${docs.map(d => `<li style="margin:0 0 4px"><b>${esc(d.name)}</b>${d.required ? " <span style='color:#B42318'>(Required)</span>" : " <span style='color:#667085'>(If applicable)</span>"}${d.description ? ` — ${esc(d.description)}` : ""}</li>`).join("") || "<li>Please upload required clearance documents.</li>"}</ul>
      <p style="margin:8px 0 0;font-size:13px;color:#475467">Default templates/reference documents (if provided by FedEx/admin for this case) are available in the secure link — they are not attached to this email.</p>
    </div>
    <p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#4D148C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Open Secure Document Link</a></p>
    <p style="font-size:12px;color:#667085;margin:0">This is a secure, shipment-specific link. Please do not share it. Upload complete and legible documents so Clearance Desk can track pending vs received items.</p>
  </div>`;
}
