import type { Metadata } from "next";

export const metadata: Metadata = { title: "Outreach" };

export default function L({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
