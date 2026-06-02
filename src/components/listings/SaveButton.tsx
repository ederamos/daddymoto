"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
}

export function SaveButton({ listingId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    fetch(`/api/saved?listingId=${listingId}`)
      .then((r) => r.json())
      .then((d) => { setSaved(d.saved); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session, listingId]);

  async function toggle() {
    if (!session) { router.push("/auth/login"); return; }
    const prev = saved;
    setSaved(!prev);
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) setSaved(prev); // revert on error
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? "Remove from saved" : "Save listing"}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all border ${
        saved
          ? "border-red-700 bg-red-950/40 text-red-400 hover:bg-red-950"
          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      <svg
        className="w-4 h-4"
        fill={saved ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
