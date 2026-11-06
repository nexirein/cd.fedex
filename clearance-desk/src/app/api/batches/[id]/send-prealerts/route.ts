import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";
import { sendMail } from "@/lib/email/smtp";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, user } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("*").eq("id", 1).single();
  const testMode = false; // restriction removed for now: send pre-alerts without TEST MODE/allow-list gating
  const sendable: string[] = settings?.sendable_end_results || ["NFBRK","FEBRK-JEENA","FEBRK-SUNIMPEX"];
  const { data: allow } = await admin.from("allow_list").select("email").eq("is_active", true);
  const allowSet = new Set((allow || []).map((a: any) => String(a.email).toLowerCase()));

  const { data: shipments, error } = await admin.from("shipments").select("*").eq("batch_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  let sent = 0, blocked = 0, skipped = 0, failed = 0;

  for (const s of shipments || []) {
    if (s.send_state === "SENT") { skipped++; continue; }
    if (s.preflight_result !== "PASS" || !sendable.includes(String(s.end_result || "").toUpperCase())) { blocked++; continue; }
    const to = String(s.contact_email || "").trim().toLowerCase();
    if (!to) { blocked++; continue; }
    // Restrictions removed for now: allow-list/TEST MODE not enforced.
    const token = s.link_token || randomUUID();
    const link = `${base}/c/${token}`;
    const subject = `FedEx Clearance: Action required for AWB ${s.awb}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;color:#101828;max-width:560px">
      <h2 style="color:#4D148C;margin:0 0 8px">FedEx Clearance Desk</h2>
      <p style="margin:0 0 12px">Please review your shipment details and upload the required clearance documents using the secure link below.</p>
      <div style="background:#F9FAFB;border:1px solid #EAECF0;border-radius:12px;padding:14px 16px;margin:0 0 16px">
        <p style="margin:0"><b>AWB:</b> ${s.awb}<br/>
        <b>Company:</b> ${s.company_name || "—"}<br/>
        <b>Clearance / End Result:</b> ${s.clearance_type || s.end_result || "—"}${s.broker ? `<br/><b>Broker:</b> ${s.broker}` : ""}</p>
      </div>
      <p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#4D148C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Open Secure Document Link</a></p>
      <p style="font-size:12px;color:#667085;margin:0">This is a secure, shipment-specific link. Please do not share it. If you need help, contact the FedEx Clearance Desk team.</p>
    </div>`;
    try {
      const info = await sendMail({ to, subject, html });
      await admin.from("shipments").update({ link_token: token, send_state: "SENT", sent_at: new Date().toISOString() }).eq("id", s.id);
      await admin.from("messages").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL", recipient: to, subject, template_key: "CD_PREALERT_V1", status: "SENT", provider_message_id: info?.messageId || null, link_token: token });
      await admin.from("shipment_events").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "PREALERT_SENT", actor_type: profile?.role || "AGENT", actor_id: profile?.id || null, detail: { to, test_mode: testMode, unrestricted: true } });
      sent++;
    } catch (e: any) {
      failed++;
      await admin.from("shipments").update({ link_token: token, send_state: "FAILED" }).eq("id", s.id);
      await admin.from("messages").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL", recipient: to, subject, template_key: "CD_PREALERT_V1", status: "FAILED", link_token: token, error: e?.message || "send failed" });
      await admin.from("shipment_events").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "SEND_BLOCKED", actor_type: "SYSTEM", detail: { error: e?.message } });
    }
  }
  return NextResponse.json({ ok: true, sent, blocked, skipped, failed, testMode });
}
