import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "Explore" };

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
