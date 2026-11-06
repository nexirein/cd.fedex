import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: shipment } = await admin.from("shipments").select("id,batch_id,awb").eq("link_token", token).single();
  if (!shipment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "clearance-documents";
    const path = `batches/${shipment.batch_id}/shipments/${shipment.awb}/${Date.now()}_${safe}`;
    const { error: upErr } = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}. Ensure bucket '${bucket}' exists.` }, { status: 500 });
    await admin.from("documents").insert({
      shipment_id: shipment.id, batch_id: shipment.batch_id, awb: shipment.awb,
      file_name: file.name, content_type: file.type || "application/octet-stream",
      storage_bucket: bucket, storage_path: path, source: "PORTAL", received: true,
    });
    await admin.from("shipment_events").insert({
      shipment_id: shipment.id, batch_id: shipment.batch_id, awb: shipment.awb,
      event_type: "DOC_RECEIVED", actor_type: "CUSTOMER", detail: { file_name: file.name, source: "PORTAL" },
    });
    return NextResponse.json({ ok: true, file_name: file.name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
