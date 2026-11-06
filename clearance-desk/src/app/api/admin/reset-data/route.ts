import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { profile } = await getSessionProfile();
    if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: 'Confirmation required. Send { "confirm": "DELETE" }.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "clearance-documents";

    // Best-effort: remove stored document files
    const { data: docs } = await admin.from("documents").select("storage_path");
    const paths = (docs || []).map((d: any) => d.storage_path).filter(Boolean);
    if (paths.length) {
      // Supabase storage remove accepts up to 1000 paths
      for (let i = 0; i < paths.length; i += 1000) {
        await admin.storage.from(bucket).remove(paths.slice(i, i + 1000));
      }
    }

    // Delete operational data (FK-safe order). Keep profiles (logins) and app_settings.
    const tables = ["documents", "messages", "shipment_events", "shipments", "batches", "allow_list"] as const;
    const deleted: Record<string, number | null> = {};
    for (const table of tables) {
      // delete all rows
      const { error, count } = await admin.from(table).delete({ count: "exact" }).not("id", "is", null);
      if (error) return NextResponse.json({ error: `Failed deleting ${table}: ${error.message}`, deleted }, { status: 500 });
      deleted[table] = count ?? null;
    }

    return NextResponse.json({
      ok: true,
      message: "Test data deleted. Admin/agent login profiles and app settings were kept.",
      deleted,
      storageObjectsRemoved: paths.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Reset failed" }, { status: 500 });
  }
}
