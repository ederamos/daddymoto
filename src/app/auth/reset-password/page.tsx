"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/auth/login?reset=1");
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-400">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-sm text-red-400 hover:text-red-300 mt-4 block">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="label">Confirm password</label>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            DADDY<span className="text-red-500">MOTO</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-100 mt-4">Set new password</h1>
          <p className="text-sm text-zinc-500 mt-1">Choose a strong password.</p>
        </div>
        <Suspense fallback={<div className="card p-6 text-zinc-500 text-sm">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-zinc-500 mt-6">
          <Link href="/auth/login" className="text-red-400 hover:text-red-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
