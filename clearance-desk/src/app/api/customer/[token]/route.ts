import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: settings } = await admin.from("app_settings").select("checklist").eq("id", 1).single();
  const checklist = (settings?.checklist || []).map((item: any) => {
    const name = item.name || String(item);
    const keys: Record<string,string[]> = { "Commercial Invoice":["invoice"], "Packing List":["packing","pack"], "KYC Document":["kyc","id","passport","pan","aadhar"], "IEC / GST (if applicable)":["iec","gst","tax"] };
    const k = keys[name] || [name.toLowerCase().split(" ")[0]];
    const uploaded = (docs || []).some((d: any) => k.some(x => String(d.file_name||"").toLowerCase().includes(x)));
    return { name, required: !!item.required, status: uploaded ? "UPLOADED" : "REQUIRED" };
  });
  return NextResponse.json({ shipment, documents: docs || [], checklist });
}
