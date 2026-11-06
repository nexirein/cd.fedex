"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/utils";
import { LINK_STATUS_META, type LinkStatus } from "@/lib/rules";
import { Send, Loader2 } from "lucide-react";

type Row = any;

export function LinksTableClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [resend, setResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const ids = useMemo(() => rows.map((r) => String(r.shipment_id)).filter(Boolean), [rows]);
  const selectedIds = useMemo(() => ids.filter((id) => selected[id]), [ids, selected]);
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(ids.map((id) => [id, true])));
  };
  const toggleOne = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));

  const sendSelected = async () => {
    if (!selectedIds.length) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/shipments/send-prealerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentIds: selectedIds, resend }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error || "Send failed");
      else {
        setResult(j);
        setSelected({});
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message || "Send failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--fx-border)] bg-white px-4 py-3">
        <button
          className="fx-btn fx-btn-primary fx-btn-sm"
          onClick={sendSelected}
          disabled={!selectedIds.length || loading}
          title="Send pre-alerts to selected shipments"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Send pre-alerts ({selectedIds.length})
        </button>
        <label className="flex items-center gap-2 text-[13px] text-[var(--fx-text-muted)]">
          <input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} />
          Resend if already sent
        </label>
        <span className="text-[12px] text-[var(--fx-text-subtle)]">
          Sends to eligible selected AWBs (PASS + sendable end result + email). Skips ineligible; skips already sent unless resend is checked.
        </span>
      </div>

      {error ? <div className="rounded-[12px] border border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] px-4 py-3 text-[13px] text-[var(--fx-danger)]">{error}</div> : null}
      {result ? (
        <div className="rounded-[12px] border border-[var(--fx-success-border)] bg-[var(--fx-success-bg)] px-4 py-3 text-[13px] text-[var(--fx-text)]">
          <b>Send action complete:</b> Sent {result.sent} · Blocked {result.blocked} · Skipped {result.skipped} · Failed {result.failed}
          {Array.isArray(result.details) && result.details.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] font-semibold text-[var(--fx-purple-700)]">View per-AWB results</summary>
              <div className="mt-2 max-h-48 overflow-auto rounded-[10px] border border-[var(--fx-border)] bg-white">
                <table className="fx-table text-[12px]">
                  <thead><tr><th>AWB</th><th>Status</th><th>Reason</th></tr></thead>
                  <tbody>
                    {result.details.map((d: any, i: number) => (
                      <tr key={i}><td className="fx-mono">{d.awb}</td><td>{d.status}</td><td>{d.reason || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="fx-card overflow-hidden">
        <div className="overflow-auto">
          <table className="fx-table">
            <thead>
              <tr>
                <th className="w-[44px]">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                  />
                </th>
                <th>AWB</th><th>Company</th><th>Email</th><th>Pre-flight</th><th>Sent</th><th>Opened</th><th>Docs</th><th>Link Status</th><th>Batch</th><th>Trace</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r: any) => {
                const id = String(r.shipment_id);
                const m = LINK_STATUS_META[r.link_status as LinkStatus] || LINK_STATUS_META.NOT_SENT;
                return (
                  <tr key={id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select AWB ${r.awb}`}
                        checked={!!selected[id]}
                        onChange={() => toggleOne(id)}
                      />
                    </td>
                    <td className="fx-mono font-semibold"><Link href={`/shipments/${r.awb}?batch=${r.batch_id}`} className="text-[var(--fx-purple-700)] hover:underline">{r.awb}</Link></td>
                    <td>{r.company_name || "—"}</td>
                    <td className="text-[13px]">{r.contact_email || <span className="fx-badge fx-badge-danger">Missing</span>}</td>
                    <td><span className={r.preflight_result === "PASS" ? "fx-badge fx-badge-success" : r.preflight_result === "BLOCKED" ? "fx-badge fx-badge-danger" : "fx-badge fx-badge-neutral"}>{r.preflight_result}</span></td>
                    <td className="text-[13px] text-[var(--fx-text-subtle)]">{fmtDate(r.sent_at)}</td>
                    <td className="text-[13px]">{r.link_opened_at ? fmtDate(r.link_opened_at) : <span className="text-[var(--fx-text-subtle)]">—</span>}</td>
                    <td>{r.doc_count ? <span className="fx-badge fx-badge-success">{r.doc_count}</span> : <span className="text-[var(--fx-text-subtle)]">0</span>}</td>
                    <td><span className={`fx-badge ${m.badge}`}>{m.label}</span></td>
                    <td className="text-[13px] text-[var(--fx-text-subtle)]"><Link className="hover:underline" href={`/batches/${r.batch_id}`}>{r.batch_code}</Link></td>
                    <td><Link className="font-semibold text-[var(--fx-purple-700)] hover:underline" href={`/shipments/${r.awb}?batch=${r.batch_id}`}>Open</Link></td>
                  </tr>
                );
              }) : <tr><td colSpan={11} className="p-8 text-center text-[13px] text-[var(--fx-text-subtle)]">No rows match the current filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
