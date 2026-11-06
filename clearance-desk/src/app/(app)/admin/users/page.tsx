"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";

type User = { id: string; email: string; full_name: string | null; role: string; is_active: boolean; created_at: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "AGENT" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || "Failed to load users");
    else setUsers(j.users || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg(""); setSaving(true);
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Failed to create user"); return; }
    setMsg(`User created. Share credentials: ${form.email} / (password you set).`);
    setForm({ email: "", full_name: "", password: "", role: "AGENT" });
    load();
  };

  return (
    <>
      <Topbar title="Users" subtitle="Admin can create users and share email/password credentials" />
      <main className="p-6 grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <div className="fx-card p-5">
          <h3 className="text-[16px] font-semibold mb-4">Create User</h3>
          <form onSubmit={create} className="space-y-3">
            <div><label className="fx-label">Full name</label><input className="fx-input" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} /></div>
            <div><label className="fx-label">Email</label><input className="fx-input" type="email" required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><label className="fx-label">Password</label><input className="fx-input" type="text" required minLength={8} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Set a temporary password" /></div>
            <div><label className="fx-label">Role</label><select className="fx-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}><option value="AGENT">AGENT</option><option value="ADMIN">ADMIN</option></select></div>
            {err ? <div className="text-[13px] text-[var(--fx-danger)]">{err}</div> : null}
            {msg ? <div className="rounded-[10px] bg-[var(--fx-success-bg)] border border-[var(--fx-success-border)] px-3 py-2 text-[13px] text-[var(--fx-success)]">{msg}</div> : null}
            <button className="fx-btn fx-btn-primary w-full" disabled={saving} type="submit">{saving?"Creating…":"Create User"}</button>
          </form>
        </div>
        <div className="fx-card">
          <div className="border-b border-[var(--fx-border)] px-5 py-4"><h3 className="text-[16px] font-semibold">Team Users</h3></div>
          <div className="overflow-auto">
            <table className="fx-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>
              {loading ? <tr><td colSpan={4} className="p-6 text-[var(--fx-text-subtle)]">Loading…</td></tr> : users.length ? users.map(u => (
                <tr key={u.id}><td className="font-medium">{u.full_name || "—"}</td><td>{u.email}</td><td><span className={u.role==="ADMIN"?"fx-badge fx-badge-purple":"fx-badge fx-badge-neutral"}>{u.role}</span></td><td><span className={u.is_active?"fx-badge fx-badge-success":"fx-badge fx-badge-neutral"}>{u.is_active?"Active":"Inactive"}</span></td></tr>
              )) : <tr><td colSpan={4} className="p-6 text-[var(--fx-text-subtle)]">No profiles found. After creating the first admin in Supabase Auth, add a `profiles` row (see migration note).</td></tr>}
            </tbody></table>
          </div>
        </div>
      </main>
    </>
  );
}
