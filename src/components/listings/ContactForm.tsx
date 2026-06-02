"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface Props {
  listingId: string;
}

export function ContactForm({ listingId }: Props) {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, name, email, body }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg bg-green-900/30 border border-green-800/50 p-4 text-center">
        <p className="text-sm text-green-400 font-semibold">Message sent!</p>
        <p className="text-xs text-green-700 mt-1">The seller will be in touch via email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Contact Seller</p>
      <div>
        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <input
          type="email"
          className="input"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder="Hi, I'm interested in your listing…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full py-3"
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
