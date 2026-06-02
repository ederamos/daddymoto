"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <>
      {resetSuccess && (
        <p className="text-sm text-green-400 text-center mb-4">
          Password updated! Sign in with your new password.
        </p>
      )}

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
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="text-right -mt-2">
          <Link href="/auth/forgot-password" className="text-xs text-zinc-500 hover:text-red-400">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-red-400 hover:text-red-300">
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            DADDY<span className="text-red-500">MOTO</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-100 mt-4">Sign in</h1>
          <p className="text-sm text-zinc-500 mt-1">Welcome back, rider.</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
