"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="page-container">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-black tracking-tighter text-white">
              DADDY<span className="text-red-500">MOTO</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/listings" className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Browse
            </Link>
            <Link href="/categories" className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Categories
            </Link>
            <Link href="/search" className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Search
            </Link>
          </nav>

          {/* Search bar */}
          <form action="/search" className="hidden md:flex flex-1 max-w-xs">
            <input
              name="q"
              type="search"
              placeholder="Search listings…"
              className="input text-xs py-2"
            />
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/post" className="btn-primary text-xs px-3 py-2 hidden sm:inline-flex">
              + Post a Listing
            </Link>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <span className="hidden sm:inline">{session.user?.name?.split(" ")[0]}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
                    <Link href="/dashboard" className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>My Listings</Link>
                    <Link href="/dashboard/saved" className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>Saved</Link>
                    <Link href="/dashboard/messages" className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>Messages</Link>
                    <Link href="/dashboard/profile" className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <div className="border-t border-zinc-700" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-outline text-xs px-3 py-2">
                  Sign in
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
