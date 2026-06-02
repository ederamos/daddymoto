import { redirect } from "next/navigation";

// Redirect /search?q=foo to /listings?q=foo
export default function SearchPage({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams(searchParams as Record<string, string>);
  redirect(`/listings?${params.toString()}`);
}
