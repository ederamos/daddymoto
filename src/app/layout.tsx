import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Daddy Moto — Motorcycle Classifieds",
    template: "%s | Daddy Moto",
  },
  description:
    "Buy and sell motorcycles, parts, and gear. The best classifieds for moto enthusiasts.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://daddymoto.com"),
  openGraph: {
    type: "website",
    siteName: "Daddy Moto",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
