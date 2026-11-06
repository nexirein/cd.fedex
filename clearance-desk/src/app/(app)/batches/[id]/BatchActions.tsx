"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BatchActions({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const send = async () => {
    setLoading(true); setMsg("");
    const res = await fetch(`/api/batches/${batchId}/send-prealerts`, { method: "POST" });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) setMsg(j.error || "Send failed");
    else setMsg(`Sent ${j.sent}, blocked ${j.blocked}, already sent ${j.skipped}, failed ${j.failed}.`);
    router.refresh();
  };
  return (
    <div className="flex items-center gap-2">
      {msg ? <span className="text-[12px] text-[var(--fx-text-subtle)] max-w-[320px]">{msg}</span> : null}
      <button className="fx-btn fx-btn-secondary fx-btn-sm" onClick={()=>router.refresh()}>Refresh</button>
      <button className="fx-btn fx-btn-accent fx-btn-sm" onClick={send} disabled={loading}>{loading?"Sending…":"Send Pre-Alerts"}</button>
    </div>
  );
}
