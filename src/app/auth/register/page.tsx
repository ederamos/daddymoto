"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { US_STATES } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "", state: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto sign in
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            DADDY<span className="text-red-500">MOTO</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-100 mt-4">Create account</h1>
          <p className="text-sm text-zinc-500 mt-1">Join the moto community.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} autoComplete="new-password" />
            <p className="text-xs text-zinc-600 mt-1">Minimum 8 characters</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label">State</label>
              <select className="select" value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">—</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{code} – {name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Creating account…" : "Create Account"}
          </button>
          <p className="text-xs text-center text-zinc-600">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-zinc-400 hover:text-zinc-300">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-zinc-400 hover:text-zinc-300">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-red-400 hover:text-red-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
