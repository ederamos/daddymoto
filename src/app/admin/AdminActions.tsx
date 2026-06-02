"use client";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
  currentStatus: string;
}

export function AdminActions({ listingId, currentStatus }: Props) {
  const router = useRouter();

  async function setStatus(status: string) {
    await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function deleteListing() {
    if (!confirm("Permanently delete this listing?")) return;
    await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {currentStatus !== "active" && (
        <button onClick={() => setStatus("active")} className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-400 hover:bg-green-900 border border-green-800/50 transition-colors">
          Approve
        </button>
      )}
      {currentStatus !== "removed" && (
        <button onClick={() => setStatus("removed")} className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-500 hover:bg-yellow-900/60 border border-yellow-800/40 transition-colors">
          Remove
        </button>
      )}
      <button onClick={deleteListing} className="text-xs px-2 py-1 rounded bg-red-950/40 text-red-400 hover:bg-red-950 border border-red-900/50 transition-colors">
        Delete
      </button>
    </div>
  );
}
