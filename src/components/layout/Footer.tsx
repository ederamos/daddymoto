import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-16">
      <div className="page-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-black tracking-tighter">
              DADDY<span className="text-red-500">MOTO</span>
            </Link>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              The best place to buy and sell motorcycles, parts, and gear in the US.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Browse</h3>
            <ul className="space-y-2">
              {[
                ["All Listings", "/listings"],
                ["Sport", "/categories/sport"],
                ["Cruiser", "/categories/cruiser"],
                ["Adventure", "/categories/adventure"],
                ["Parts", "/categories/parts"],
                ["Gear", "/categories/gear"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Sell</h3>
            <ul className="space-y-2">
              {[
                ["Post a Listing", "/post"],
                ["My Dashboard", "/dashboard"],
                ["Pricing", "/pricing"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Site</h3>
            <ul className="space-y-2">
              {[
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Terms", "/terms"],
                ["Privacy", "/privacy"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Daddy Moto. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Ride safe. Buy smart.
          </p>
        </div>
      </div>
    </footer>
  );
}
