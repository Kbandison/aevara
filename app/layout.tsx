// app/layout.tsx
import "./globals.css";
import { Inter, EB_Garamond } from "next/font/google";
import { cn } from "@/lib/utils"; // If you use shadcn/ui utils

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-ebgaramond",
  display: "swap",
});

export const metadata = {
  title: "Aevara – AI Art Prints",
  description:
    "Create, customize, and order AI-generated wall art. Powered by Next.js, Supabase, and Stripe.",
  openGraph: {
    title: "Aevara – AI Art Prints",
    description: "Create, customize, and order AI-generated wall art.",
    url: "https://aevara.art", // Update for your domain
    siteName: "Aevara",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aevara AI Wall Art",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-bg text-text antialiased font-sans",
          inter.variable,
          ebGaramond.variable
        )}
      >
        {/* Accessible skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-bg px-4 py-2 rounded"
        >
          Skip to main content
        </a>
        {/* NavBar, Footer, Toast, etc. can go here */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
