import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/state/user";
import { ToastProvider } from "@/components/shell/ToastContainer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mercor | Creators & Influencers",
    template: "Mercor | %s",
  },
  description:
    "The Creators & Influencers expert vertical on the Mercor platform. Apply to brand campaigns, get matched, get paid via Stripe.",
  icons: { icon: "/mercor-favicon.ico" },
  openGraph: {
    title: "Mercor | Creators & Influencers",
    description:
      "The Creators & Influencers expert vertical on the Mercor platform.",
    url: "https://rallyai.org",
    siteName: "Mercor",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <UserProvider>
          <ToastProvider>{children}</ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
