
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";
import Link from "next/link";

export default async function BatchesPage() {
  let batches: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("batches").select("*").order("created_at", { ascending: false }).limit(100);
    batches = data || [];
  } catch {}
  return (
    <>
      <Topbar title="Batches" subtitle="Imported UBOND/CONSOL workbooks" actions={<Link href="/import" className="fx-btn fx-btn-primary">+ Import Batch</Link>} />
      <main className="p-6">
        <div className="fx-card">
          <div className="overflow-auto">
            <table className="fx-table">
              <thead><tr><th>Batch</th><th>Type</th><th>File</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {batches.length ? batches.map(b => (
                  <tr key={b.id}><td className="font-semibold">{b.batch_code}</td><td><span className="fx-badge fx-badge-purple">{b.kind||"—"}</span></td><td className="text-[var(--fx-text-subtle)]">{b.file_name}</td><td className="text-[13px] text-[var(--fx-text-subtle)]">{fmtDate(b.created_at)}</td><td><Link href={`/batches/${b.id}`} className="fx-btn fx-btn-secondary fx-btn-sm">Open Board</Link></td></tr>
                )) : <tr><td colSpan={5} className="p-10 text-center text-[var(--fx-text-subtle)]">No batches yet. <Link href="/import" className="text-[var(--fx-purple-700)] font-semibold hover:underline">Import a batch</Link>.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
