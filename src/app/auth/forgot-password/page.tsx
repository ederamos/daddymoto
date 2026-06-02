"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            DADDY<span className="text-red-500">MOTO</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-100 mt-4">Reset password</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="card p-6 text-center space-y-3">
            <p className="text-green-400 font-medium">Check your inbox.</p>
            <p className="text-sm text-zinc-400">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              It expires in 1 hour.
            </p>
            <Link href="/auth/login" className="text-sm text-red-400 hover:text-red-300">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500 mt-6">
          <Link href="/auth/login" className="text-red-400 hover:text-red-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
