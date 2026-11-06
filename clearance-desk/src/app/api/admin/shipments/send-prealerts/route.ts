import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";
import { sendMail } from "@/lib/email/smtp";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { profile, user } = await getSessionProfile();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shipmentIds: string[] = Array.isArray(body?.shipmentIds) ? body.shipmentIds.filter(Boolean) : [];
    const resend = body?.resend === true;
    if (!shipmentIds.length) return NextResponse.json({ error: "No shipments selected" }, { status: 400 });

    const admin = createAdminClient();
    const { data: settings } = await admin.from("app_settings").select("*").eq("id", 1).single();
    const testMode = false; // demo/open sending
    const sendable: string[] = settings?.sendable_end_results || ["NFBRK", "FEBRK-JEENA", "FEBRK-SUNIMPEX"];

    const { data: shipments, error } = await admin
      .from("shipments")
      .select("*")
      .in("id", shipmentIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    let sent = 0, blocked = 0, skipped = 0, failed = 0;
    const details: Array<{ awb: string; status: string; reason?: string }> = [];

    for (const s of shipments || []) {
      const awb = String(s.awb || "");
      if (s.send_state === "SENT" && !resend) {
        skipped++;
        details.push({ awb, status: "SKIPPED", reason: "Already sent" });
        continue;
      }
      if (s.preflight_result !== "PASS" || !sendable.includes(String(s.end_result || "").toUpperCase())) {
        blocked++;
        details.push({ awb, status: "BLOCKED", reason: s.preflight_reason || "Not eligible (must be PASS and sendable end result)" });
        continue;
      }
      const to = String(s.contact_email || "").trim().toLowerCase();
      if (!to) {
        blocked++;
        details.push({ awb, status: "BLOCKED", reason: "No recipient email" });
        continue;
      }

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
        await admin.from("messages").insert({
          shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL",
          recipient: to, subject, template_key: "CD_PREALERT_V1", status: "SENT",
          provider_message_id: info?.messageId || null, link_token: token,
        });
        await admin.from("shipment_events").insert({
          shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "PREALERT_SENT",
          actor_type: profile?.role || "AGENT", actor_id: profile?.id || null,
          detail: { to, test_mode: testMode, unrestricted: true, source: "admin_link_dashboard", resend },
        });
        sent++;
        details.push({ awb, status: "SENT", reason: `Sent to ${to}` });
      } catch (e: any) {
        failed++;
        await admin.from("shipments").update({ link_token: token, send_state: "FAILED" }).eq("id", s.id);
        await admin.from("messages").insert({
          shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL",
          recipient: to, subject, template_key: "CD_PREALERT_V1", status: "FAILED", link_token: token, error: e?.message || "send failed",
        });
        await admin.from("shipment_events").insert({
          shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "SEND_BLOCKED",
          actor_type: "SYSTEM", detail: { error: e?.message, source: "admin_link_dashboard" },
        });
        details.push({ awb, status: "FAILED", reason: e?.message || "Send failed" });
      }
    }

    return NextResponse.json({ ok: true, sent, blocked, skipped, failed, total: shipmentIds.length, testMode, details });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 500 });
  }
}
