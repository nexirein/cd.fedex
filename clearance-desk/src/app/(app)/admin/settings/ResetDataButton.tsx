"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

export function ResetDataButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  const run = async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/admin/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Reset failed");
      else {
        setMsg(j.message || "Data deleted.");
        setText("");
        router.refresh();
      }
    } catch (e: any) {
      setErr(e?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fx-card border-[var(--fx-danger-border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)]/40 flex items-center gap-2">
        <AlertTriangle size={18} className="text-[var(--fx-danger)]" />
        <h3 className="text-[16px] font-semibold text-[var(--fx-danger)]">Demo / Test Data Reset</h3>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-[var(--fx-text-muted)]">
          Delete batches, shipments, pre-alert messages, events, documents, and allow-list data so you can reuse the same Excel for testing.
          <b className="text-[var(--fx-text)]"> Admin/agent login profiles and app settings are kept.</b>
        </p>
        {!open ? (
          <button className="fx-btn fx-btn-secondary" onClick={() => { setOpen(true); setMsg(""); setErr(""); }}>
            <Trash2 size={16} /> Delete test data
          </button>
        ) : (
          <div className="rounded-[12px] border border-[var(--fx-danger-border)] bg-white p-4 space-y-3">
            <div className="text-[13px] text-[var(--fx-text)]">Type <b>DELETE</b> to confirm. This cannot be undone.</div>
            <input className="fx-input max-w-[220px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" />
            <div className="flex gap-2">
              <button className="fx-btn fx-btn-secondary fx-btn-sm" onClick={() => { setOpen(false); setText(""); }} disabled={loading}>Cancel</button>
              <button className="fx-btn fx-btn-sm" style={{ background: "var(--fx-danger)", color: "#fff" }} onClick={run} disabled={loading || text !== "DELETE"}>
                {loading ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          </div>
        )}
        {err ? <div className="text-[13px] text-[var(--fx-danger)]">{err}</div> : null}
        {msg ? <div className="rounded-[10px] border border-[var(--fx-success-border)] bg-[var(--fx-success-bg)] px-3 py-2 text-[13px] text-[var(--fx-success)]">{msg}</div> : null}
      </div>
    </div>
  );
}
