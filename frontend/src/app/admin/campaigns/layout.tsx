import type { Metadata } from "next";

export const metadata: Metadata = { title: "Campaigns" };

export default function L({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
