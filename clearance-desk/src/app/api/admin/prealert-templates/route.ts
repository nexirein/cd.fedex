import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";

export async function GET() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("prealert_template_configs").select("*").order("case_key");
  if (error) return NextResponse.json({ error: error.message, hint: "Run migration 0003_prealert_templates.sql if this table does not exist." }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function PUT(req: Request) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const case_key = String(body?.case_key || "").trim();
  if (!case_key) return NextResponse.json({ error: "case_key required" }, { status: 400 });

  const patch: any = { case_key };
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.subject_template === "string") patch.subject_template = body.subject_template;
  if (typeof body.intro_text === "string") patch.intro_text = body.intro_text;
  if (body.process_steps !== undefined) patch.process_steps = body.process_steps;
  if (body.required_docs !== undefined) patch.required_docs = body.required_docs;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const admin = createAdminClient();
  const { data, error } = await admin.from("prealert_template_configs").upsert(patch, { onConflict: "case_key" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
