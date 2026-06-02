"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { US_STATES } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", city: "", state: "", phone: "", bio: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setForm({ name: d.name || "", city: d.city || "", state: d.state || "", phone: d.phone || "", bio: d.bio || "" });
    });
  }, []);

  function set(key: string, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  function setPw(key: string, value: string) { setPasswords((p) => ({ ...p, [key]: value })); }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMsg(res.ok ? "Profile saved." : "Save failed.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) { setPwMsg("Passwords don't match."); return; }
    if (passwords.next.length < 8) { setPwMsg("Must be at least 8 characters."); return; }
    setSavingPw(true); setPwMsg("");
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: passwords.current, next: passwords.next }),
    });
    setSavingPw(false);
    const d = await res.json().catch(() => ({}));
    setPwMsg(res.ok ? "Password changed." : (d.error || "Failed."));
    if (res.ok) setPasswords({ current: "", next: "", confirm: "" });
  }

  if (status === "loading") return null;
  if (!session) { router.push("/auth/login"); return null; }

  return (
    <div className="page-container py-10 max-w-xl">
      <h1 className="text-2xl font-black tracking-tight text-white mb-8">My Profile</h1>

      <form onSubmit={saveProfile} className="card p-6 space-y-4 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Account Info</h2>
        <div>
          <label className="label">Display Name</label>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <label className="label">Phone (optional, not shown publicly)</label>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 555 5555" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label">State</label>
            <select className="select" value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{code} – {name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Bio (optional)</label>
          <textarea className="input resize-none" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell buyers a bit about yourself…" />
        </div>
        {msg && <p className={`text-sm ${msg.includes("saved") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <form onSubmit={changePassword} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Change Password</h2>
        <div>
          <label className="label">Current Password</label>
          <input type="password" className="input" value={passwords.current} onChange={(e) => setPw("current", e.target.value)} required />
        </div>
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" value={passwords.next} onChange={(e) => setPw("next", e.target.value)} minLength={8} required />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" className="input" value={passwords.confirm} onChange={(e) => setPw("confirm", e.target.value)} required />
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.includes("changed") ? "text-green-400" : "text-red-400"}`}>{pwMsg}</p>}
        <button type="submit" disabled={savingPw} className="btn-primary w-full py-3">
          {savingPw ? "Updating…" : "Change Password"}
        </button>
      </form>
    </div>
  );
}
