import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeChecklistStatus, getTemplateFiles, getTemplateForShipment } from "@/lib/prealert-templates";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: shipment, error } = await admin.from("shipments").select("*, batches(batch_code)").eq("link_token", token).single();
  if (error || !shipment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  // Idempotent LINK_OPENED
  const { data: existing } = await admin.from("shipment_events").select("id").eq("shipment_id", shipment.id).eq("event_type", "LINK_OPENED").limit(1);
  if (!existing || existing.length === 0) {
    await admin.from("shipment_events").insert({
      shipment_id: shipment.id, batch_id: shipment.batch_id, awb: shipment.awb,
      event_type: "LINK_OPENED", actor_type: "CUSTOMER", detail: { token }
    });
  }
  const { data: docs } = await admin.from("documents").select("id,file_name,source,uploaded_at,content_type").eq("shipment_id", shipment.id).order("uploaded_at", { ascending: false });
  const documents = docs || [];

  let template: any = null;
  let templateFiles: any[] = [];
  let checklist: any[] = [];
  let pendingRequired: string[] = [];
  try {
    template = await getTemplateForShipment(admin as any, shipment);
    templateFiles = await getTemplateFiles(admin as any, template.case_key);
    const computed = computeChecklistStatus(template.required_docs || [], documents);
    checklist = computed.checklist;
    pendingRequired = computed.pendingRequired;
  } catch {
    // Fallback if template tables not migrated yet
    const { data: settings } = await admin.from("app_settings").select("checklist").eq("id", 1).single();
    checklist = (settings?.checklist || []).map((item: any) => {
      const name = item.name || String(item);
      const keys: Record<string,string[]> = { "Commercial Invoice":["invoice"], "Packing List":["packing","pack"], "KYC Document":["kyc","id","passport","pan","aadhar"], "IEC / GST (if applicable)":["iec","gst","tax"] };
      const k = keys[name] || [name.toLowerCase().split(" ")[0]];
      const uploaded = documents.some((d: any) => k.some(x => String(d.file_name||"").toLowerCase().includes(x)));
      return { name, required: !!item.required, status: uploaded ? "UPLOADED" : "PENDING", description: "" };
    });
    pendingRequired = checklist.filter((c: any) => c.required && c.status === "PENDING").map((c: any) => c.name);
    template = { case_key: "DEFAULT", title: "Pre-Alert Document Upload", intro_text: "Please upload required clearance documents.", process_steps: [], subject: "" };
  }

  return NextResponse.json({
    shipment,
    documents,
    checklist,
    pendingRequired,
    template: template ? { case_key: template.case_key, title: template.title, intro_text: template.intro_text, process_steps: template.process_steps, required_docs: template.required_docs } : null,
    templateFiles,
  });
}
