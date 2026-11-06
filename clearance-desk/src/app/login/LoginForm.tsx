"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-[var(--fx-bg)]">
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-[linear-gradient(145deg,var(--fx-purple-900)_0%,var(--fx-purple-700)_55%,#6d28d9_100%)] p-12 flex-col justify-between text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[var(--fx-orange-500)]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-[12px] bg-[var(--fx-orange-500)] grid place-items-center font-extrabold shadow-lg">FX</div>
          <div>
            <div className="text-[22px] font-bold tracking-tight">FedEx</div>
            <div className="text-white/75 text-[13px]">Clearance Desk</div>
          </div>
        </div>
        <div className="relative max-w-[460px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold mb-5">
            <ShieldCheck size={14} /> Secure operations workspace
          </div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight mb-4">Pre-alert, track, and collect clearance documents.</h1>
          <p className="text-white/80 text-[16px] leading-relaxed">Import UBOND/CONSOL batches, send controlled pre-alerts with tokenized links, and monitor who opened, who didn’t, and who uploaded — all in one place.</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[["Validate", "Rules-based pre-flight"], ["Send", "Auto pre-alerts (demo)"], ["Track", "Opened / docs received"]].map(([t,d])=> (
              <div key={t} className="rounded-[14px] border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                <div className="font-semibold text-[14px]">{t}</div>
                <div className="text-[12px] text-white/70 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[12px] text-white/55">Internal use · Admin-managed access · Auditable shipment events</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-[12px] bg-[var(--fx-orange-500)] grid place-items-center text-white font-extrabold">FX</div>
            <div><div className="text-[20px] font-bold text-[var(--fx-purple-700)]">Clearance Desk</div><div className="text-[13px] text-[var(--fx-text-subtle)]">FedEx operations</div></div>
          </div>
          <div className="fx-card fx-card-elevated p-8">
            <div className="mb-6">
              <h2 className="text-[26px] font-extrabold tracking-tight text-[var(--fx-text)]">Sign in</h2>
              <p className="text-[14px] text-[var(--fx-text-subtle)] mt-1">Use the email and password provided by your administrator.</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="fx-label">Email</label>
                <input className="fx-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" placeholder="name@fedex.com" />
              </div>
              <div>
                <label className="fx-label">Password</label>
                <input className="fx-input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password" />
              </div>
              {error ? <div className="rounded-[10px] border border-[var(--fx-danger-border)] bg-[var(--fx-danger-bg)] px-3 py-2.5 text-[13px] text-[var(--fx-danger)]">{error}</div> : null}
              <button className="fx-btn fx-btn-primary w-full !py-3" disabled={loading} type="submit">
                {loading ? "Signing in…" : <>Continue <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
          <p className="mt-4 text-center text-[12px] text-[var(--fx-text-subtle)]">Need access? Contact your Clearance Desk administrator.</p>
        </div>
      </div>
    </div>
  );
}
