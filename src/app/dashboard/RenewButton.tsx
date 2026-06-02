"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RenewButton({ listingId, expired }: { listingId: string; expired: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function renew() {
    setLoading(true);
    await fetch(`/api/listings/${listingId}/renew`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={renew}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        expired
          ? "bg-yellow-950/40 text-yellow-400 border-yellow-800/50 hover:bg-yellow-900/60"
          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
      }`}
    >
      {loading ? "…" : expired ? "Renew" : "Renew (expiring soon)"}
    </button>
  );
}
