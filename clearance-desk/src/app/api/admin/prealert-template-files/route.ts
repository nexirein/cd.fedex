import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const caseKey = searchParams.get("caseKey") || searchParams.get("case") || "";
  const admin = createAdminClient();
  let q = admin.from("prealert_template_files").select("*").order("created_at", { ascending: false });
  if (caseKey) q = q.eq("case_key", caseKey);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message, hint: "Run migration 0003_prealert_templates.sql if this table does not exist." }, { status: 500 });
  const files = data || [];
  // signed URLs for admin preview/download
  const withUrls = [];
  for (const f of files) {
    const { data: s } = await admin.storage.from(f.storage_bucket || "clearance-documents").createSignedUrl(f.storage_path, 60 * 30);
    withUrls.push({ ...f, download_url: s?.signedUrl || null });
  }
  return NextResponse.json({ files: withUrls });
}

export async function POST(req: Request) {
  try {
    const { profile } = await getSessionProfile();
    if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const caseKey = String(form.get("caseKey") || form.get("case_key") || "DEFAULT").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") || "DEFAULT";
    const label = String(form.get("label") || file?.name || "Template document").trim();
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const admin = createAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "clearance-documents";
    const path = `templates/${caseKey}/${Date.now()}_${safe}`;
    const { error: upErr } = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data, error } = await admin.from("prealert_template_files").insert({
      case_key: caseKey, label, file_name: file.name, content_type: file.type || null,
      storage_bucket: bucket, storage_path: path, is_active: true, uploaded_by: profile?.id || null,
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ file: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: row } = await admin.from("prealert_template_files").select("*").eq("id", id).single();
  if (row?.storage_bucket && row?.storage_path) {
    await admin.storage.from(row.storage_bucket).remove([row.storage_path]);
  }
  const { error } = await admin.from("prealert_template_files").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
