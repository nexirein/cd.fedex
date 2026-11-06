import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";

export async function GET() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req: Request) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { email, password, full_name, role } = body as { email?: string; password?: string; full_name?: string; role?: string };
  if (!email || !password || !role) return NextResponse.json({ error: "email, password, role required" }, { status: 400 });
  if (!["ADMIN", "AGENT"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name, role },
  });
  if (cErr || !created.user) return NextResponse.json({ error: cErr?.message || "Failed to create user" }, { status: 400 });
  const { error: pErr } = await admin.from("profiles").upsert({
    id: created.user.id, email, full_name: full_name || null, role, is_active: true,
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, user: { id: created.user.id, email, role } });
}
