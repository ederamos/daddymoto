"use client";

import { useState } from "react";

interface Props {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const message = `Check out ${title} on Daddy Moto`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers can still copy the URL from the address bar.
      window.prompt("Copy listing link", url);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
      } catch (error) {
        // Closing the system share sheet is an expected user action.
        if (error instanceof DOMException && error.name === "AbortError") return;
        await copyLink();
      }
    } else {
      await copyLink();
    }
  }

  const linkClass = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Share this listing">
      <button type="button" onClick={share} className={linkClass}>Share</button>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Share on Facebook (opens a new tab)"
      >Facebook</a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Share on WhatsApp (opens a new tab)"
      >WhatsApp</a>
      <button type="button" onClick={copyLink} className={linkClass} aria-live="polite">
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
