import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";
import { validateRows } from "@/lib/import/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readWorkbook(file: File) {
  // xlsx interop across bundlers
  const mod: any = await import("xlsx");
  const XLSX = mod.default || mod;
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  if (!wb.SheetNames?.length) throw new Error("Workbook has no sheets.");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }) as Record<string, any>[];
  return { rows, sheetName: wb.SheetNames[0] };
}

export async function POST(req: Request) {
  try {
    const { profile, user } = await getSessionProfile();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Please select an Excel file (.xlsx)." }, { status: 400 });
    if (!/\.(xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: "Only .xlsx/.xls files are supported." }, { status: 400 });

    const { rows, sheetName } = await readWorkbook(file);
    if (!rows.length) return NextResponse.json({ error: `No data rows found in sheet "${sheetName}".` }, { status: 400 });

    const validated = validateRows(rows);
    const admin = createAdminClient();

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await admin.from("batches").select("*", { count: "exact", head: true }).ilike("batch_code", `BATCH-${date}-%`);
    const seq = String((count || 0) + 1).padStart(3, "0");
    const kind = /CONSOL/i.test(file.name) ? "CONSOL" : /UBOND/i.test(file.name) ? "UBOND" : "OTHER";
    const batch_code = `BATCH-${date}-${seq}`;

    const { data: batch, error: bErr } = await admin.from("batches").insert({
      batch_code, file_name: file.name, kind, created_by: profile?.id || user.id || null,
    }).select().single();
    if (bErr || !batch) return NextResponse.json({ error: `Could not create batch: ${bErr?.message || "unknown error"}` }, { status: 500 });

    const shipmentRows = validated.map((v) => ({
      batch_id: batch.id, awb: v.awb || `INVALID-${Math.random().toString(36).slice(2,8)}`, company_name: v.company_name || "Unknown",
      consignee_name: v.consignee_name || null, contact_email: v.contact_email || null, email_source: v.email_source,
      end_result: v.end_result || null, broker: v.broker || null, clearance_type: v.clearance_type || null, location: v.location || null,
      freight_value: v.freight_value || null, currency: v.currency || "INR", verdict: v.verdict, preflight_result: v.preflight_result,
      preflight_reason: v.preflight_reason, send_state: "NOT_SENT", standard_remarks: v.standard_remarks || null,
      consignee_email_id_raw: v.consignee_email_id_raw || null, raw_json: v.raw_json,
    }));

    let inserted = 0;
    if (shipmentRows.length) {
      const { data: insertedRows, error: sErr } = await admin.from("shipments").insert(shipmentRows).select("id,awb,batch_id");
      if (sErr) return NextResponse.json({ error: `Batch created (${batch.batch_code}) but shipments failed: ${sErr.message}` }, { status: 500 });
      inserted = insertedRows?.length || 0;
      const events = (insertedRows || []).map((s: any) => ({
        shipment_id: s.id, batch_id: batch.id, awb: s.awb, event_type: "BATCH_IMPORTED",
        actor_type: profile?.role || "AGENT", actor_id: profile?.id || user.id || null, detail: { file: file.name, sheet: sheetName },
      }));
      if (events.length) await admin.from("shipment_events").insert(events);
    }

    const summary = {
      total: validated.length,
      accepted: validated.filter((v) => v.verdict === "ACCEPTED").length,
      rejected: validated.filter((v) => v.verdict === "REJECTED").length,
      pass: validated.filter((v) => v.preflight_result === "PASS").length,
      blocked: validated.filter((v) => v.preflight_result === "BLOCKED").length,
      skipped: validated.filter((v) => v.preflight_result === "SKIPPED").length,
      sheetName,
      inserted,
    };
    return NextResponse.json({ ok: true, batch, summary, rows: validated });
  } catch (e: any) {
    console.error("Import error:", e);
    return NextResponse.json({ error: e?.message || "Import failed. Check Supabase env vars, migration, and file format." }, { status: 500 });
  }
}
