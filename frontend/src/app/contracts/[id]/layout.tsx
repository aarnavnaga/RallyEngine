import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "Contract" };

export default function ContractLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
