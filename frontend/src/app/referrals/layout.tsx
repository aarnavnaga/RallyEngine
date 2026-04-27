import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "Referrals" };

export default function L({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
