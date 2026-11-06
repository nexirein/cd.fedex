import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";
import { sendMail } from "@/lib/email/smtp";
import { randomUUID } from "crypto";
import { getTemplateForShipment, renderPrealertEmailHtml } from "@/lib/prealert-templates";

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
    const template = await getTemplateForShipment(admin as any, s);
    const subject = template.subject;
    const html = renderPrealertEmailHtml({ shipment: s, link, template });
    try {
      const info = await sendMail({ to, subject, html });
      await admin.from("shipments").update({ link_token: token, send_state: "SENT", sent_at: new Date().toISOString() }).eq("id", s.id);
      await admin.from("messages").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL", recipient: to, subject, template_key: template.case_key, status: "SENT", provider_message_id: info?.messageId || null, link_token: token });
      await admin.from("shipment_events").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "PREALERT_SENT", actor_type: profile?.role || "AGENT", actor_id: profile?.id || null, detail: { to, test_mode: testMode, unrestricted: true, template_case: template.case_key } });
      sent++;
    } catch (e: any) {
      failed++;
      await admin.from("shipments").update({ link_token: token, send_state: "FAILED" }).eq("id", s.id);
      await admin.from("messages").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, direction: "OUTBOUND", channel: "EMAIL", recipient: to, subject, template_key: template.case_key, status: "FAILED", link_token: token, error: e?.message || "send failed" });
      await admin.from("shipment_events").insert({ shipment_id: s.id, batch_id: s.batch_id, awb: s.awb, event_type: "SEND_BLOCKED", actor_type: "SYSTEM", detail: { error: e?.message, template_case: template.case_key } });
    }
  }
  return NextResponse.json({ ok: true, sent, blocked, skipped, failed, testMode });
}
