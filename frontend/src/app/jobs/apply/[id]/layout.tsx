import type { Metadata } from "next";
import { AppShellLite } from "@/components/shell/AppShellLite";

export const metadata: Metadata = { title: "Apply" };

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLite>{children}</AppShellLite>;
}
