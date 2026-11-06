import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getSessionProfile();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const admin = createAdminClient();
    const { data: batch, error: bErr } = await admin.from("batches").select("*").eq("id", id).single();
    if (bErr || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    const { data: rows, error: rErr } = await admin.from("v_shipment_link_status").select("*").eq("batch_id", id).order("awb");
    if (rErr) return NextResponse.json({ batch, rows: [], error: rErr.message }, { status: 200 });
    return NextResponse.json({ batch, rows: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load batch" }, { status: 500 });
  }
}
